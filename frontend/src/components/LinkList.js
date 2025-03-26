import React, { useState } from 'react';
import LinkItem from './LinkItem';
import EditLinkForm from './EditLinkForm';

const LinkList = ({ links, onDelete, onUpdate, allTags }) => {
  const [editingLinkId, setEditingLinkId] = useState(null);
  
  const handleEdit = (id) => {
    setEditingLinkId(id);
  };
  
  const handleCloseEdit = () => {
    setEditingLinkId(null);
  };
  
  const linkToEdit = links.find(link => link.id === editingLinkId);
  
  return (
    <div>
      {links.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          No links found. Add some links to get started!
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {links.map(link => (
            <LinkItem 
              key={link.id} 
              link={link} 
              onDelete={onDelete} 
              onEdit={handleEdit} 
            />
          ))}
        </ul>
      )}
      
      {editingLinkId && (
        <EditLinkForm 
          link={linkToEdit} 
          onUpdate={(data) => {
            onUpdate(editingLinkId, data);
            handleCloseEdit();
          }} 
          onClose={handleCloseEdit}
          existingTags={allTags}
        />
      )}
    </div>
  );
};

export default LinkList;