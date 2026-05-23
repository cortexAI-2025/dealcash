import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { listingsApi } from '../services/api';
import { Listing } from '../types';

interface ListingsState {
  items: Listing[];
  loading: boolean;
  error: string | null;
  pagination: { page: number; totalPages: number; total: number };
  filters: Record<string, string>;
}

const initialState: ListingsState = {
  items: [],
  loading: false,
  error: null,
  pagination: { page: 1, totalPages: 1, total: 0 },
  filters: {},
};

export const fetchListings = createAsyncThunk(
  'listings/fetch',
  async (params: Record<string, string | number> = {}, { rejectWithValue }) => {
    try {
      const { data } = await listingsApi.getAll(params);
      return data;
    } catch {
      return rejectWithValue('Failed to load listings');
    }
  }
);

export const createListing = createAsyncThunk(
  'listings/create',
  async (listingData: object, { rejectWithValue }) => {
    try {
      const { data } = await listingsApi.create(listingData);
      return data.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(error.response?.data?.error || 'Failed to create listing');
    }
  }
);

const listingsSlice = createSlice({
  name: 'listings',
  initialState,
  reducers: {
    setFilters(state, action) {
      state.filters = action.payload;
    },
    clearFilters(state) {
      state.filters = {};
    },
    updateListingStatus(state, action: { payload: { id: string; status: Listing['status'] } }) {
      const listing = state.items.find((l) => l.id === action.payload.id);
      if (listing) listing.status = action.payload.status;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchListings.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchListings.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchListings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(createListing.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      });
  },
});

export const { setFilters, clearFilters, updateListingStatus } = listingsSlice.actions;
export default listingsSlice.reducer;
