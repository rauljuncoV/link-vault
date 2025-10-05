import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddLinkForm from '../components/AddLinkForm';

// Mock fetch
global.fetch = jest.fn();

const mockOnAdd = jest.fn();
const mockOnClose = jest.fn();
const mockExistingTags = ['javascript', 'react', 'tutorial'];

describe('AddLinkForm with Metadata Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders form with metadata controls', () => {
    render(
      <AddLinkForm
        onAdd={mockOnAdd}
        onClose={mockOnClose}
        existingTags={mockExistingTags}
      />
    );

    expect(screen.getByText('Add New Link')).toBeInTheDocument();
    expect(screen.getByLabelText(/Auto-fetch metadata/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Link title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Page description/)).toBeInTheDocument();
  });

  test('auto-fetch metadata checkbox is checked by default', () => {
    render(
      <AddLinkForm
        onAdd={mockOnAdd}
        onClose={mockOnClose}
        existingTags={mockExistingTags}
      />
    );

    const checkbox = screen.getByLabelText(/Auto-fetch metadata/);
    expect(checkbox).toBeChecked();
  });

  test('fetches metadata when URL is entered', async () => {
    const mockMetadata = {
      title: 'Test Page Title',
      description: 'Test page description',
      favicon: 'https://example.com/favicon.ico',
      suggestedTags: ['test', 'example']
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        metadata: mockMetadata
      })
    });

    const user = userEvent.setup();
    render(
      <AddLinkForm
        onAdd={mockOnAdd}
        onClose={mockOnClose}
        existingTags={mockExistingTags}
      />
    );

    const urlInput = screen.getByPlaceholderText('https://example.com');
    await user.type(urlInput, 'https://example.com');

    // Wait for debounced metadata fetch
    await waitFor(
      () => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/links/metadata?url=https%3A//example.com'
        );
      },
      { timeout: 1000 }
    );

    // Check if metadata was populated
    await waitFor(() => {
      const titleInput = screen.getByDisplayValue('Test Page Title');
      expect(titleInput).toBeInTheDocument();
    });

    const descriptionInput = screen.getByDisplayValue('Test page description');
    expect(descriptionInput).toBeInTheDocument();
  });

  test('shows loading indicator while fetching metadata', async () => {
    fetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ success: true, metadata: {} })
            });
          }, 100);
        })
    );

    const user = userEvent.setup();
    render(
      <AddLinkForm
        onAdd={mockOnAdd}
        onClose={mockOnClose}
        existingTags={mockExistingTags}
      />
    );

    const urlInput = screen.getByPlaceholderText('https://example.com');
    await user.type(urlInput, 'https://example.com');

    await waitFor(() => {
      expect(screen.getByText('Fetching metadata...')).toBeInTheDocument();
    });
  });

  test('shows error when metadata fetch fails', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        error: 'Failed to fetch page content'
      })
    });

    const user = userEvent.setup();
    render(
      <AddLinkForm
        onAdd={mockOnAdd}
        onClose={mockOnClose}
        existingTags={mockExistingTags}
      />
    );

    const urlInput = screen.getByPlaceholderText('https://example.com');
    await user.type(urlInput, 'https://example.com');

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch page content/)).toBeInTheDocument();
    });
  });

  test('shows auto-populated indicators', async () => {
    const mockMetadata = {
      title: 'Auto Title',
      description: 'Auto description',
      suggestedTags: ['auto-tag']
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        metadata: mockMetadata
      })
    });

    const user = userEvent.setup();
    render(
      <AddLinkForm
        onAdd={mockOnAdd}
        onClose={mockOnClose}
        existingTags={mockExistingTags}
      />
    );

    const urlInput = screen.getByPlaceholderText('https://example.com');
    await user.type(urlInput, 'https://example.com');

    await waitFor(() => {
      expect(screen.getByText(/Auto-populated:/)).toBeInTheDocument();
      expect(screen.getAllByText('auto')).toHaveLength(2); // title and description badges
    });
  });

  test('removes auto-populated indicator when field is manually edited', async () => {
    const mockMetadata = {
      title: 'Auto Title',
      description: 'Auto description'
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        metadata: mockMetadata
      })
    });

    const user = userEvent.setup();
    render(
      <AddLinkForm
        onAdd={mockOnAdd}
        onClose={mockOnClose}
        existingTags={mockExistingTags}
      />
    );

    const urlInput = screen.getByPlaceholderText('https://example.com');
    await user.type(urlInput, 'https://example.com');

    // Wait for auto-population
    await waitFor(() => {
      expect(screen.getByDisplayValue('Auto Title')).toBeInTheDocument();
    });

    // Edit the title
    const titleInput = screen.getByDisplayValue('Auto Title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Manual Title');

    // Auto indicator should be removed for title but remain for description
    expect(screen.getAllByText('auto')).toHaveLength(1); // Only description
  });

  test('clears all auto-populated data when Clear button is clicked', async () => {
    const mockMetadata = {
      title: 'Auto Title',
      description: 'Auto description',
      suggestedTags: ['auto-tag']
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        metadata: mockMetadata
      })
    });

    const user = userEvent.setup();
    render(
      <AddLinkForm
        onAdd={mockOnAdd}
        onClose={mockOnClose}
        existingTags={mockExistingTags}
      />
    );

    const urlInput = screen.getByPlaceholderText('https://example.com');
    await user.type(urlInput, 'https://example.com');

    // Wait for auto-population
    await waitFor(() => {
      expect(screen.getByDisplayValue('Auto Title')).toBeInTheDocument();
    });

    // Click clear button
    const clearButton = screen.getByText('Clear');
    await user.click(clearButton);

    // Check that fields are cleared
    expect(screen.getByPlaceholderText('Link title')).toHaveValue('');
    expect(screen.getByPlaceholderText(/Page description/)).toHaveValue('');
    expect(screen.queryByText(/Auto-populated:/)).not.toBeInTheDocument();
  });

  test('refreshes metadata when Refresh button is clicked', async () => {
    const mockMetadata = {
      title: 'Refreshed Title',
      description: 'Refreshed description'
    };

    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        metadata: mockMetadata
      })
    });

    const user = userEvent.setup();
    render(
      <AddLinkForm
        onAdd={mockOnAdd}
        onClose={mockOnClose}
        existingTags={mockExistingTags}
      />
    );

    const urlInput = screen.getByPlaceholderText('https://example.com');
    await user.type(urlInput, 'https://example.com');

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    // Click refresh button
    const refreshButton = screen.getByText('Refresh');
    await user.click(refreshButton);

    // Should make another fetch call
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  test('does not fetch metadata when auto-fetch is disabled', async () => {
    const user = userEvent.setup();
    render(
      <AddLinkForm
        onAdd={mockOnAdd}
        onClose={mockOnClose}
        existingTags={mockExistingTags}
      />
    );

    // Disable auto-fetch
    const checkbox = screen.getByLabelText(/Auto-fetch metadata/);
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();

    // Enter URL
    const urlInput = screen.getByPlaceholderText('https://example.com');
    await user.type(urlInput, 'https://example.com');

    // Wait a bit to ensure no fetch is made
    await waitFor(
      () => {
        expect(fetch).not.toHaveBeenCalled();
      },
      { timeout: 1000 }
    );
  });

  test('displays favicon when available', async () => {
    const mockMetadata = {
      title: 'Test Page',
      favicon: 'https://example.com/favicon.ico'
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        metadata: mockMetadata
      })
    });

    const user = userEvent.setup();
    render(
      <AddLinkForm
        onAdd={mockOnAdd}
        onClose={mockOnClose}
        existingTags={mockExistingTags}
      />
    );

    const urlInput = screen.getByPlaceholderText('https://example.com');
    await user.type(urlInput, 'https://example.com');

    await waitFor(() => {
      const favicon = screen.getByAltText('Site favicon');
      expect(favicon).toBeInTheDocument();
      expect(favicon).toHaveAttribute('src', 'https://example.com/favicon.ico');
    });
  });

  test('submits form with metadata fields', async () => {
    const user = userEvent.setup();
    render(
      <AddLinkForm
        onAdd={mockOnAdd}
        onClose={mockOnClose}
        existingTags={mockExistingTags}
      />
    );

    // Fill form manually
    await user.type(screen.getByPlaceholderText('https://example.com'), 'https://example.com');
    await user.type(screen.getByPlaceholderText('Link title'), 'Test Title');
    await user.type(screen.getByPlaceholderText(/Page description/), 'Test description');

    // Submit form
    const submitButton = screen.getByText('Save Link');
    await user.click(submitButton);

    expect(mockOnAdd).toHaveBeenCalledWith({
      url: 'https://example.com',
      title: 'Test Title',
      notes: '',
      description: 'Test description',
      tags: [],
      fetchMetadata: true
    });
  });

  test('handles network errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const user = userEvent.setup();
    render(
      <AddLinkForm
        onAdd={mockOnAdd}
        onClose={mockOnClose}
        existingTags={mockExistingTags}
      />
    );

    const urlInput = screen.getByPlaceholderText('https://example.com');
    await user.type(urlInput, 'https://example.com');

    await waitFor(() => {
      expect(screen.getByText(/Network error while fetching metadata/)).toBeInTheDocument();
    });
  });
});