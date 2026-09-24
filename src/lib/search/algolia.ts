import { algoliasearch } from 'algoliasearch';

export type ExternalSearchResult = {
  objectID: string;
  id: string;
  type: 'subject' | 'chapter' | 'resource' | 'lecture' | 'past-paper';
  name: string;
  subtitle: string;
  href: string;
};

function getSettings(mode: 'search' | 'admin') {
  const appId = process.env.ALGOLIA_APP_ID;
  const apiKey = mode === 'admin' ? process.env.ALGOLIA_ADMIN_API_KEY : process.env.ALGOLIA_SEARCH_API_KEY;
  const indexName = process.env.ALGOLIA_INDEX_NAME || 'ilm_ai_public_catalog';
  return appId && apiKey ? { appId, apiKey, indexName } : null;
}

export function isAlgoliaSearchEnabled() {
  return process.env.ALGOLIA_ENABLED === 'true' && Boolean(getSettings('search'));
}

export async function searchAlgoliaCatalog(query: string): Promise<ExternalSearchResult[] | null> {
  const settings = getSettings('search');
  if (!isAlgoliaSearchEnabled() || !settings) return null;
  try {
    const response = await algoliasearch(settings.appId, settings.apiKey).searchSingleIndex<ExternalSearchResult>({
      indexName: settings.indexName,
      searchParams: { query, hitsPerPage: 20, attributesToRetrieve: ['id', 'type', 'name', 'subtitle', 'href'] },
    });
    return response.hits.map(({ objectID, id, type, name, subtitle, href }) => ({
      objectID,
      id,
      type,
      name,
      subtitle,
      href,
    }));
  } catch (error) {
    console.warn('Algolia search failed; using Supabase search:', error);
    return null;
  }
}

export async function replaceAlgoliaCatalog(objects: ExternalSearchResult[]) {
  const settings = getSettings('admin');
  if (!settings) throw new Error('Algolia admin configuration is missing.');
  return algoliasearch(settings.appId, settings.apiKey).replaceAllObjects({
    indexName: settings.indexName,
    objects,
    batchSize: 500,
  });
}
