import React, { useState, useEffect, useRef } from 'react';

const AddLinkForm = ({ onAdd, onClose, existingTags }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState([]);
  const [currentTag, setCurrentTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const modalRef = useRef();
  const urlInputRef = useRef();

  // Focus on URL input when modal opens
  useEffect(() => {
    urlInputRef.current.focus();
  }, []);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!url) {
      setError('URL is required');
      return;
    }

    if (!title) {
      setError('Title is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onAdd({ url, title, notes, tags });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Process and add tags
  const processTags = (input) => {
    if (!input.trim()) return;

    // Split by comma, trim whitespace, convert to lowercase, and filter out empty strings
    const newTags = input.split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);

    // Add only unique tags that don't already exist in the current tags array
    const uniqueTags = newTags.filter(tag => !tags.includes(tag));

    if (uniqueTags.length > 0) {
      setTags([...tags, ...uniqueTags]);
    }

    setCurrentTag('');
  };

  // Add a tag
  const addTag = () => {
    processTags(currentTag);
  };

  // Remove a tag
  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Handle tag suggestion click
  const handleTagSuggestionClick = (tag) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  // Filter suggestions to show only tags not already selected
  const filteredSuggestions = existingTags.filter(tag =>
    !tags.includes(tag) &&
    (currentTag ? tag.toLowerCase().includes(currentTag.toLowerCase()) : true)
  );

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Add New Link</h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
              URL *
            </label>
            <input
              ref={urlInputRef}
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Link title"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add some notes about this link"
              rows="3"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div className="flex">
              <input
                type="text"
                id="tags"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    processTags(currentTag);
                  } else if (e.key === 'Backspace' && currentTag === '' && tags.length > 0) {
                    // Remove the last tag when pressing Backspace with empty input
                    e.preventDefault();
                    setTags(tags.slice(0, -1));
                  }
                }}
                onBlur={() => processTags(currentTag)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add tags (comma-separated)"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-r-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Add
              </button>
            </div>

            {/* Tag suggestions */}
            {currentTag && filteredSuggestions.length > 0 && (
              <div className="mt-1 border border-gray-200 rounded-md shadow-sm">
                <ul className="max-h-32 overflow-y-auto">
                  {filteredSuggestions.map(tag => (
                    <li
                      key={tag}
                      onClick={() => handleTagSuggestionClick(tag)}
                      className="px-3 py-1 hover:bg-gray-100 cursor-pointer text-sm"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Selected tags */}
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLinkForm;