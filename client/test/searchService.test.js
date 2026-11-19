// client/test/searchService.test.js
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { searchService } from '../src/services/searchService.js';
import apiClient from '../src/services/apiClient.js';

const originalGet = apiClient.get;

afterEach(() => {
  apiClient.get = originalGet;
});

test('searchService.searchPosts sends GET request with params to /v1/search', async () => {
  let calledUrl = '';
  let calledOptions = null;

  apiClient.get = async (url, options) => {
    calledUrl = url;
    calledOptions = options;
    return {
      data: {
        query: 'nấm',
        type: 'ALL',
        results: { blogs: [], videos: [] },
        meta: { total: 0 },
      },
    };
  };

  const result = await searchService.searchPosts({ q: 'nấm', type: 'ALL', page: 1, limit: 10 });
  assert.equal(calledUrl, '/v1/search');
  assert.deepEqual(calledOptions.params, { q: 'nấm', type: 'ALL', page: 1, limit: 10 });
  assert.equal(result.query, 'nấm');
  assert.deepEqual(result.results.blogs, []);
  assert.deepEqual(result.results.videos, []);
});

test('searchService.searchPosts defaults to trimmed query and ALL type', async () => {
  let calledOptions = null;

  apiClient.get = async (url, options) => {
    calledOptions = options;
    return { data: { success: true } };
  };

  await searchService.searchPosts({ q: '  bí đỏ  ' });
  assert.equal(calledOptions.params.q, 'bí đỏ');
  assert.equal(calledOptions.params.type, 'ALL');
});

test('searchService.suggestByKeyword sends GET request to /v1/recommendations', async () => {
  let calledUrl = '';
  let calledOptions = null;

  apiClient.get = async (url, options) => {
    calledUrl = url;
    calledOptions = options;
    return {
      data: {
        keyword: 'tofu',
        recommendations: { videos: [], shops: [] },
      },
    };
  };

  const result = await searchService.suggestByKeyword('tofu');
  assert.equal(calledUrl, '/v1/recommendations');
  assert.deepEqual(calledOptions.params, { keyword: 'tofu' });
  assert.deepEqual(result.recommendations.videos, []);
});
