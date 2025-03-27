import React, { useState, useEffect } from 'react';
import LinkList from './components/LinkList';
import AddLinkForm from './components/AddLinkForm';
import SearchBar from './components/SearchBar';
import TagFilter from './components/TagFilter';
import { API_URL } from './config';

function App() {
  const [links, setLinks] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Check if any filters are active
  const hasActiveFilters = searchTerm !== '' || selectedTags.length > 0 || sortBy !== 'createdAt' || sortOrder !== 'desc';

  // Fetch links based on filters
  const fetchLinks = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let url = `${API_URL}/links?sortBy=${sortBy}&sortOrder=${sortOrder}`;

      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }

      if (selectedTags.length > 0) {
        // For simplicity, we're just using the first selected tag for filtering
        // A more complex implementation would handle multiple tags
        url += `&tag=${encodeURIComponent(selectedTags[0])}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch links');
      }

      const data = await response.json();
      setLinks(data);

      // Extract all unique tags
      const tags = new Set();
      data.forEach(link => {
        if (link.tags) {
          link.tags.forEach(tag => tags.add(tag));
        }
      });

      setAllTags(Array.from(tags));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchLinks();
  }, [searchTerm, selectedTags, sortBy, sortOrder]);

  // Add a new link
  const handleAddLink = async (linkData) => {
    try {
      const response = await fetch(`${API_URL}/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(linkData),
      });

      if (!response.ok) {
        throw new Error('Failed to add link');
      }

      setIsAddModalOpen(false);
      fetchLinks();
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete a link
  const handleDeleteLink = async (id) => {
    try {
      const response = await fetch(`${API_URL}/links/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete link');
      }

      fetchLinks();
    } catch (err) {
      setError(err.message);
    }
  };

  // Update a link
  const handleUpdateLink = async (id, data) => {
    try {
      const response = await fetch(`${API_URL}/links/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update link');
      }

      fetchLinks();
    } catch (err) {
      setError(err.message);
    }
  };

  // Clear all filters and reset to default values
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">LinkVault</h1>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Link
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-4 mb-2">
              <div className="flex-1">
                <SearchBar
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                />
              </div>
              <div className="md:w-1/3">
                <TagFilter
                  allTags={allTags}
                  selectedTags={selectedTags}
                  setSelectedTags={setSelectedTags}
                />
              </div>
              <div className="md:w-1/4">
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [newSortBy, newSortOrder] = e.target.value.split('-');
                    setSortBy(newSortBy);
                    setSortOrder(newSortOrder);
                  }}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="createdAt-desc">Newest First</option>
                  <option value="createdAt-asc">Oldest First</option>
                  <option value="title-asc">Title (A-Z)</option>
                  <option value="title-desc">Title (Z-A)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
                className={`px-3 py-1 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 ${hasActiveFilters ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                Clear Filters
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <LinkList
              links={links}
              onDelete={handleDeleteLink}
              onUpdate={handleUpdateLink}
              allTags={allTags}
            />
          )}
        </div>
      </main>

      {isAddModalOpen && (
        <AddLinkForm
          onAdd={handleAddLink}
          onClose={() => setIsAddModalOpen(false)}
          existingTags={allTags}
        />
      )}
    </div>
  );
}

export default App;