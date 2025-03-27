import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddLinkForm from '../components/AddLinkForm';

// Mock the onAdd and onClose functions
const mockOnAdd = jest.fn();
const mockOnClose = jest.fn();

describe('Tag Input Functionality', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Render the AddLinkForm component
    render(
      <AddLinkForm 
        onAdd={mockOnAdd} 
        onClose={mockOnClose} 
        existingTags={['react', 'javascript', 'web']} 
      />
    );
  });

  test('should add multiple tags when comma-separated input is provided', () => {
    // Get the tag input field
    const tagInput = screen.getByPlaceholderText('Add tags (comma-separated)');
    
    // Enter comma-separated tags
    fireEvent.change(tagInput, { target: { value: 'react, node.js, typescript' } });
    
    // Press Enter to add the tags
    fireEvent.keyDown(tagInput, { key: 'Enter' });
    
    // Check if the tags were added (only 'node.js' and 'typescript' should be added since 'react' already exists in existingTags)
    expect(screen.getByText('node.js')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
    
    // Input should be cleared
    expect(tagInput.value).toBe('');
  });

  test('should trim whitespace and convert tags to lowercase', () => {
    // Get the tag input field
    const tagInput = screen.getByPlaceholderText('Add tags (comma-separated)');
    
    // Enter tags with whitespace and mixed case
    fireEvent.change(tagInput, { target: { value: '  Redux  ,  GraphQL  ' } });
    
    // Press Enter to add the tags
    fireEvent.keyDown(tagInput, { key: 'Enter' });
    
    // Check if the tags were added with trimmed whitespace and lowercase
    expect(screen.getByText('redux')).toBeInTheDocument();
    expect(screen.getByText('graphql')).toBeInTheDocument();
    
    // Input should be cleared
    expect(tagInput.value).toBe('');
  });

  test('should not add empty tags or duplicate tags', () => {
    // Get the tag input field
    const tagInput = screen.getByPlaceholderText('Add tags (comma-separated)');
    
    // Enter tags with empty values and duplicates
    fireEvent.change(tagInput, { target: { value: 'react, , javascript, , react' } });
    
    // Press Enter to add the tags
    fireEvent.keyDown(tagInput, { key: 'Enter' });
    
    // No new tags should be added since 'react' and 'javascript' already exist in existingTags
    // and empty tags should be filtered out
    
    // Input should be cleared
    expect(tagInput.value).toBe('');
  });

  test('should remove the last tag when pressing Backspace with empty input', () => {
    // Get the tag input field
    const tagInput = screen.getByPlaceholderText('Add tags (comma-separated)');
    
    // Add a tag first
    fireEvent.change(tagInput, { target: { value: 'redux' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });
    
    // Verify the tag was added
    expect(screen.getByText('redux')).toBeInTheDocument();
    
    // Press Backspace with empty input
    fireEvent.keyDown(tagInput, { key: 'Backspace' });
    
    // The 'redux' tag should be removed
    expect(screen.queryByText('redux')).not.toBeInTheDocument();
  });

  test('should add tags when Tab key is pressed', () => {
    // Get the tag input field
    const tagInput = screen.getByPlaceholderText('Add tags (comma-separated)');
    
    // Enter a tag
    fireEvent.change(tagInput, { target: { value: 'redux' } });
    
    // Press Tab to add the tag
    fireEvent.keyDown(tagInput, { key: 'Tab' });
    
    // Check if the tag was added
    expect(screen.getByText('redux')).toBeInTheDocument();
    
    // Input should be cleared
    expect(tagInput.value).toBe('');
  });

  test('should add tags when input loses focus', () => {
    // Get the tag input field
    const tagInput = screen.getByPlaceholderText('Add tags (comma-separated)');
    
    // Enter a tag
    fireEvent.change(tagInput, { target: { value: 'redux' } });
    
    // Blur the input
    fireEvent.blur(tagInput);
    
    // Check if the tag was added
    expect(screen.getByText('redux')).toBeInTheDocument();
    
    // Input should be cleared
    expect(tagInput.value).toBe('');
  });
});
