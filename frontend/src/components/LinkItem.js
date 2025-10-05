import React from 'react';

const LinkItem = ({ link, onDelete, onEdit }) => {
  // Extract domain from URL
  const getDomain = (url) => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch (e) {
      return url;
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  return (
    <li className="py-4">
      <div className="flex flex-col sm:flex-row sm:justify-between">
        <div className="mb-2 sm:mb-0 flex-1">
          <div className="flex items-center mb-1">
            {link.favicon_url && (
              <img
                src={link.favicon_url}
                alt="Site favicon"
                className="w-4 h-4 mr-2 flex-shrink-0"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <a 
              href={link.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-lg font-medium text-blue-600 hover:text-blue-800 truncate"
            >
              {link.title}
            </a>
            {link.auto_populated && (
              <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded flex-shrink-0">
                auto
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{getDomain(link.url)}</p>
          {link.description && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{link.description}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEdit(link.id)}
            className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(link.id)}
            className="text-sm px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded"
          >
            Delete
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(link.url)}
            className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            title="Copy link to clipboard"
          >
            Copy
          </button>
        </div>
      </div>
      
      {link.notes && (
        <p className="mt-2 text-sm text-gray-600">{link.notes}</p>
      )}
      
      <div className="mt-2 flex flex-wrap gap-1">
        {link.tags && link.tags.map(tag => (
          <span 
            key={tag} 
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
          >
            {tag}
          </span>
        ))}
      </div>
      
      <p className="mt-1 text-xs text-gray-400">
        Added on {formatDate(link.createdAt)}
      </p>
    </li>
  );
};

export default LinkItem;