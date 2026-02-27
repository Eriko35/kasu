// ============================================
// MUSEUM API INTEGRATION
// National Museum Database Integration for Kamuseo
// ============================================

/**
 * Museum API Service
 * Integrates with various museum APIs to provide artwork data
 */

// Metropolitan Museum of Art API (Free, no key required)
const MET_API_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';

// Smithsonian API
const SMITHSONIAN_API_BASE = 'https://api.si.edu/openaccess/api/v1';

// Art Institute of Chicago API
const AIC_API_BASE = 'https://api.artic.edu/api/v1';

/**
 * Search Metropolitan Museum of Art
 * @param {string} query - Search query
 * @param {number} limit - Number of results
 * @returns {Promise<Array>} - Array of artwork objects
 */
export async function searchMetMuseum(query, limit = 20) {
    try {
        // Search for objects
        const searchResponse = await fetch(
            `${MET_API_BASE}/search?q=${encodeURIComponent(query)}&hasImages=true`
        );
        
        if (!searchResponse.ok) {
            throw new Error('Failed to search museum');
        }
        
        const searchData = await searchResponse.json();
        const objectIDs = searchData.objectIDs?.slice(0, limit) || [];
        
        // Fetch details for each object
        const artworks = await Promise.all(
            objectIDs.map(async (id) => {
                try {
                    const objResponse = await fetch(`${MET_API_BASE}/objects/${id}`);
                    const objData = await objResponse.json();
                    
                    return formatMetArtwork(objData);
                } catch (e) {
                    return null;
                }
            })
        );
        
        return artworks.filter(a => a !== null);
    } catch (error) {
        console.error('Met Museum search error:', error);
        return [];
    }
}

/**
 * Get artwork details from Metropolitan Museum
 * @param {string} objectId - Museum object ID
 * @returns {Promise<Object>} - Artwork object
 */
export async function getMetArtwork(objectId) {
    try {
        const response = await fetch(`${MET_API_BASE}/objects/${objectId}`);
        
        if (!response.ok) {
            throw new Error('Failed to get artwork');
        }
        
        const data = await response.json();
        return formatMetArtwork(data);
    } catch (error) {
        console.error('Get Met artwork error:', error);
        return null;
    }
}

/**
 * Format Metropolitan Museum artwork data
 */
function formatMetArtwork(data) {
    return {
        id: `met-${data.objectID}`,
        museumId: 'met',
        museumName: 'The Metropolitan Museum of Art',
        externalId: data.objectID,
        title: data.title || 'Untitled',
        artist: data.artistDisplayName || 'Unknown Artist',
        artistBio: data.artistDisplayBio || '',
        date: data.objectDate || '',
        medium: data.medium || '',
        dimensions: data.dimensions || '',
        department: data.department || '',
        culture: data.culture || '',
        imageUrl: data.primaryImageSmall || data.primaryImage || '',
        imageLarge: data.primaryImage || '',
        description: data.objectName || '',
        creditLine: data.creditLine || '',
        classification: data.classification || ''
    };
}

/**
 * Search Art Institute of Chicago
 * @param {string} query - Search query
 * @param {number} limit - Number of results
 * @returns {Promise<Array>} - Array of artwork objects
 */
export async function searchArtInstitute(query, limit = 20) {
    try {
        const response = await fetch(
            `${AIC_API_BASE}/artworks/search?q=${encodeURIComponent(query)}&fields=id,title,artist_display,date_display,medium_display,image_id,description&limit=${limit}`
        );
        
        if (!response.ok) {
            throw new Error('Failed to search Art Institute');
        }
        
        const data = await response.json();
        
        return data.data.map(artwork => formatAICArtwork(artwork));
    } catch (error) {
        console.error('Art Institute search error:', error);
        return [];
    }
}

/**
 * Format Art Institute of Chicago artwork data
 */
function formatAICArtwork(data) {
    const imageUrl = data.image_id 
        ? `https://www.artic.edu/iiif/2/${data.image_id}/full/400,/0/default.jpg`
        : '';
    
    return {
        id: `aic-${data.id}`,
        museumId: 'aic',
        museumName: 'Art Institute of Chicago',
        externalId: data.id,
        title: data.title || 'Untitled',
        artist: data.artist_display || 'Unknown Artist',
        date: data.date_display || '',
        medium: data.medium_display || '',
        imageUrl: imageUrl,
        imageLarge: data.image_id 
            ? `https://www.artic.edu/iiif/2/${data.image_id}/full/1686,/0/default.jpg`
            : '',
        description: data.description || ''
    };
}

/**
 * Get artwork details from Art Institute
 * @param {string} artworkId - Art Institute artwork ID
 * @returns {Promise<Object>} - Artwork object
 */
export async function getAICArtwork(artworkId) {
    try {
        const response = await fetch(
            `${AIC_API_BASE}/artworks/${artworkId}?fields=id,title,artist_display,date_display,medium_display,image_id,description`
        );
        
        if (!response.ok) {
            throw new Error('Failed to get artwork');
        }
        
        const data = await response.json();
        return formatAICArtwork(data.data);
    } catch (error) {
        console.error('Get AIC artwork error:', error);
        return null;
    }
}

/**
 * Get collections by category from Met Museum
 * @param {string} department - Department name
 * @returns {Promise<Array>} - Array of artworks
 */
export async function getMetCollection(department, limit = 20) {
    try {
        // First get the department ID
        const deptResponse = await fetch(`${MET_API_BASE}/departments`);
        const deptData = await deptResponse.json();
        
        const dept = deptData.departments.find(d => d.displayName === department);
        
        if (!dept) {
            // Try a general search by department name
            return searchMetMuseum(department, limit);
        }
        
        // Search within department
        const searchResponse = await fetch(
            `${MET_API_BASE}/search?departmentId=${dept.departmentId}&hasImages=true`
        );
        
        const searchData = await searchResponse.json();
        const objectIDs = searchData.objectIDs?.slice(0, limit) || [];
        
        const artworks = await Promise.all(
            objectIDs.slice(0, 10).map(async (id) => {
                try {
                    const objResponse = await fetch(`${MET_API_BASE}/objects/${id}`);
                    const objData = await objResponse.json();
                    return formatMetArtwork(objData);
                } catch (e) {
                    return null;
                }
            })
        );
        
        return artworks.filter(a => a !== null);
    } catch (error) {
        console.error('Get Met collection error:', error);
        return [];
    }
}

/**
 * Get popular/searchable categories
 */
export function getPopularCategories() {
    return [
        { id: 'paintings', name: 'Paintings', query: 'painting' },
        { id: 'sculptures', name: 'Sculptures', query: 'sculpture' },
        { id: 'photographs', name: 'Photographs', query: 'photograph' },
        { id: 'drawings', name: 'Drawings', query: 'drawing' },
        { id: 'prints', name: 'Prints', query: 'print' },
        { id: 'asian', name: 'Asian Art', query: 'asian art' },
        { id: 'european', name: 'European Art', query: 'european painting' },
        { id: 'american', name: 'American Art', query: 'american art' },
        { id: 'modern', name: 'Modern Art', query: 'modern art' },
        { id: 'ancient', name: 'Ancient Art', query: 'ancient art' },
        { id: 'african', name: 'African Art', query: 'african art' },
        { id: 'oceanic', name: 'Oceanic Art', query: 'oceanic art' }
    ];
}

/**
 * Search all museums
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Combined results from all museums
 */
export async function searchAllMuseums(query) {
    try {
        const [metResults, aicResults] = await Promise.all([
            searchMetMuseum(query, 10),
            searchArtInstitute(query, 10)
        ]);
        
        // Combine and sort by relevance
        return [...metResults, ...aicResults];
    } catch (error) {
        console.error('Search all museums error:', error);
        return [];
    }
}

/**
 * Get artwork by museum and ID
 * @param {string} museumId - Museum identifier
 * @param {string} externalId - External artwork ID
 * @returns {Promise<Object>} - Artwork object
 */
export async function getArtworkByMuseum(museumId, externalId) {
    switch(museumId) {
        case 'met':
            return getMetArtwork(externalId);
        case 'aic':
            return getAICArtwork(externalId);
        default:
            return null;
    }
}

// Export all functions
export default {
    searchMetMuseum,
    getMetArtwork,
    searchArtInstitute,
    getAICArtwork,
    getMetCollection,
    getPopularCategories,
    searchAllMuseums,
    getArtworkByMuseum
};
