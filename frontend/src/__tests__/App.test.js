import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

// Mock the fetch function
global.fetch = jest.fn();

describe('Clear Filters Button', () => {
  beforeEach(() => {
    // Mock successful API response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        {
          id: '1',
          url: 'https://example.com',
          title: 'Example Link',
          tags: ['tag1', 'tag2'],
          createdAt: '2023-01-01T00:00:00.000Z'
        }
      ])
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Clear Filters button should be disabled when no filters are applied', async () => {
    render(<App />);

    // Wait for the initial data to load
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    // Find the Clear Filters button
    const clearFiltersButton = screen.getByText('Clear Filters');

    // Button should be disabled initially
    expect(clearFiltersButton).toBeDisabled();
  });

  test('Clear Filters button should be enabled when search filter is applied', async () => {
    render(<App />);

    // Wait for the initial data to load
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    // Apply search filter
    const searchInput = screen.getByPlaceholderText(/Search links/i);
    fireEvent.change(searchInput, { target: { value: 'test search' } });

    // Mock the fetch call for the search
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([])
    });

    // Wait for the search API call
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    // Find the Clear Filters button
    const clearFiltersButton = screen.getByText('Clear Filters');

    // Button should be enabled
    expect(clearFiltersButton).not.toBeDisabled();
  });

  test('Clear Filters button should reset all filters when clicked', async () => {
    render(<App />);

    // Wait for the initial data to load
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    // Apply search filter
    const searchInput = screen.getByPlaceholderText(/Search links/i);
    fireEvent.change(searchInput, { target: { value: 'test search' } });

    // Mock the fetch call for the search
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([])
    });

    // Wait for the search API call
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    // Change sort order
    const sortDropdown = screen.getByRole('combobox');
    fireEvent.change(sortDropdown, { target: { value: 'title-asc' } });

    // Mock the fetch call for the sort change
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([])
    });

    // Wait for the sort API call
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));

    // Find the Clear Filters button
    const clearFiltersButton = screen.getByText('Clear Filters');

    // Button should be enabled
    expect(clearFiltersButton).not.toBeDisabled();

    // Click the Clear Filters button
    fireEvent.click(clearFiltersButton);

    // Mock the fetch call after clearing filters
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([])
    });

    // Wait for the API call after clearing filters
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(4));

    // Search input should be empty
    expect(searchInput.value).toBe('');

    // Sort dropdown should be reset to default
    expect(sortDropdown.value).toBe('createdAt-desc');

    // Button should be disabled again
    expect(clearFiltersButton).toBeDisabled();
  });
});
