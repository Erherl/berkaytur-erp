/**
 * Persistent application cache bridge.
 * Local storage keys are mirrored to PostgreSQL so the browser cache is never the primary source of truth.
 */

import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { successResponse, errorResponse } from '../utils/response';

const DEFAULT_NAMESPACE = 'bkt_';
const MAX_KEY_LENGTH = 160;
const MAX_VALUE_LENGTH = 200_000;
const MAX_KEYS_PER_REQUEST = 250;

function getNamespace(req: Request) {
  const raw = String(req.query.namespace || req.body?.namespace || DEFAULT_NAMESPACE).trim();
  return raw || DEFAULT_NAMESPACE;
}

function getActorScopeId(req: Request) {
  const actor = (req as any).user;
  return actor?.id || actor?.username || 'anonymous';
}

function getScopedKeyPrefix(namespace: string, actorScopeId: string) {
  return `${namespace}${actorScopeId}::`;
}

function normalizeLogicalKey(key: unknown, namespace: string) {
  if (typeof key !== 'string') return null;
  const trimmed = key.trim();
  if (!trimmed || trimmed.length > MAX_KEY_LENGTH) return null;
  if (!trimmed.startsWith(namespace)) return null;
  return trimmed;
}

function toStoredKey(logicalKey: string, namespace: string, actorScopeId: string) {
  return `${getScopedKeyPrefix(namespace, actorScopeId)}${logicalKey.slice(namespace.length)}`;
}

function toLogicalKey(storedKey: string, namespace: string, actorScopeId: string) {
  const prefix = getScopedKeyPrefix(namespace, actorScopeId);
  if (!storedKey.startsWith(prefix)) return storedKey;
  return `${namespace}${storedKey.slice(prefix.length)}`;
}

export const AppStorageController = {
  async list(req: Request, res: Response) {
    const namespace = getNamespace(req);
    const actorScopeId = getActorScopeId(req);
    const scopedPrefix = getScopedKeyPrefix(namespace, actorScopeId);

    const entries = await prisma.appStorageEntry.findMany({
      where: {
        namespace,
        key: { startsWith: scopedPrefix },
        isDeleted: false,
      },
      orderBy: { updatedAt: 'desc' },
      take: MAX_KEYS_PER_REQUEST,
    });

    res.json(successResponse({
      namespace,
      entries: entries.map((entry) => ({
        key: toLogicalKey(entry.key, namespace, actorScopeId),
        value: entry.value,
        updatedAt: entry.updatedAt,
      })),
    }, 'Uygulama önbellek kayıtları başarıyla getirildi.'));
  },

  async bulkUpsert(req: Request, res: Response) {
    const namespace = getNamespace(req);
    const actor = (req as any).user;
    const actorScopeId = getActorScopeId(req);
    const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];

    if (!entries.length) {
      return res.status(400).json(errorResponse('Kaydedilecek en az bir önbellek girdisi gönderilmelidir.'));
    }

    if (entries.length > MAX_KEYS_PER_REQUEST) {
      return res.status(400).json(errorResponse(`Tek istekte en fazla ${MAX_KEYS_PER_REQUEST} kayıt eşitlenebilir.`));
    }

    const payload = entries
      .map((entry: any) => {
        const logicalKey = normalizeLogicalKey(entry?.key, namespace);
        if (!logicalKey) return null;

        const rawValue = typeof entry?.value === 'string' ? entry.value : JSON.stringify(entry?.value ?? null);
        if (rawValue.length > MAX_VALUE_LENGTH) return null;

        return {
          key: toStoredKey(logicalKey, namespace, actorScopeId),
          namespace,
          value: rawValue,
          category: entry?.category ? String(entry.category).slice(0, 80) : 'client-cache',
          updatedBy: actor?.id || actor?.username || 'system',
          createdBy: actor?.id || actor?.username || 'system',
          isDeleted: false,
        };
      })
      .filter(Boolean) as Array<any>;

    if (!payload.length) {
      return res.status(400).json(errorResponse('Gönderilen kayıtlar doğrulanamadı.'));
    }

    await prisma.$transaction(
      payload.map((entry) =>
        prisma.appStorageEntry.upsert({
          where: { key: entry.key },
          update: {
            value: entry.value,
            category: entry.category,
            updatedBy: entry.updatedBy,
            isDeleted: false,
          },
          create: entry,
        })
      )
    );

    res.json(successResponse({ namespace, updated: payload.length }, 'Uygulama önbellek girdileri PostgreSQL üzerinde güncellendi.'));
  },

  async bulkDelete(req: Request, res: Response) {
    const namespace = getNamespace(req);
    const actorScopeId = getActorScopeId(req);
    const keys = Array.isArray(req.body?.keys) ? req.body.keys : [];

    if (!keys.length) {
      return res.status(400).json(errorResponse('Silinecek anahtar listesi gönderilmelidir.'));
    }

    const normalizedKeys = (keys as unknown[])
      .map((key: unknown) => normalizeLogicalKey(key, namespace))
      .filter((logicalKey: string | null): logicalKey is string => Boolean(logicalKey))
      .map((logicalKey: string) => toStoredKey(logicalKey, namespace, actorScopeId)) as string[];

    if (!normalizedKeys.length) {
      return res.status(400).json(errorResponse('Geçerli anahtar bulunamadı.'));
    }

    await prisma.appStorageEntry.updateMany({
      where: {
        namespace,
        key: { in: normalizedKeys },
      },
      data: {
        isDeleted: true,
        updatedBy: (req as any).user?.id || (req as any).user?.username || 'system',
      },
    });

    res.json(successResponse({ namespace, deleted: normalizedKeys.length }, 'Uygulama önbellek girdileri silindi.'));
  },
};
