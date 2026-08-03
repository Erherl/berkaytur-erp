/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { SearchService } from '../services/searchService';
import { successResponse } from '../utils/response';
import { getResourceScope } from '../utils/scopeFilter';

export const SearchController = {
  async search(req: Request, res: Response) {
    const q = req.query.q ? String(req.query.q) : '';
    const user = (req as any).user;
    const scope = user && user.role !== 'admin' ? await getResourceScope(user) : undefined;
    const results = await SearchService.search(q, scope);
    res.json(successResponse(results, 'Genel arama sonuçları başarıyla listelendi.'));
  }
};
