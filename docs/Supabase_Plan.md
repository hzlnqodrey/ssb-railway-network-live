# 🗄️ Supabase Integration Plan

## Overview

This document outlines the plan to integrate Supabase as a backend database for the Swiss Railway Network Live application. Currently, favorites are stored in localStorage (browser-only). Supabase will enable:

- **Cross-device sync** - Access favorites from any device
- **User authentication** - Personal accounts with secure login
- **Real-time updates** - Live sync across browser tabs/devices
- **Data persistence** - Server-side storage that won't be lost

---

## 📋 Table of Contents

1. [Current Architecture](#current-architecture)
2. [Target Architecture](#target-architecture)
3. [Phase 1: Supabase Setup](#phase-1-supabase-setup)
4. [Phase 2: Database Schema](#phase-2-database-schema)
5. [Phase 3: Authentication](#phase-3-authentication)
6. [Phase 4: API Integration](#phase-4-api-integration)
7. [Phase 5: Real-time Sync](#phase-5-real-time-sync)
8. [Phase 6: Migration Strategy](#phase-6-migration-strategy)
9. [Security Considerations](#security-considerations)
10. [Cost Estimation](#cost-estimation)

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                               │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │  React Frontend │───▶│  localStorage                   │ │
│  │                 │    │  - swiss-railway-favorites-*    │ │
│  └────────┬────────┘    └─────────────────────────────────┘ │
│           │                                                  │
└───────────┼──────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                     GO BACKEND                               │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │  REST API       │───▶│  In-Memory Storage (temporary)  │ │
│  │  /api/favorites │    │  - Lost on server restart       │ │
│  └─────────────────┘    └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Current Limitations
- ❌ Data only persists in browser localStorage
- ❌ No cross-device sync
- ❌ No user accounts
- ❌ Data lost if browser storage cleared

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                               │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │  React Frontend │───▶│  localStorage (offline cache)   │ │
│  │  + Supabase SDK │    │  - Falls back when offline      │ │
│  └────────┬────────┘    └─────────────────────────────────┘ │
│           │                                                  │
└───────────┼──────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                      SUPABASE                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Auth        │  │ Database    │  │ Real-time           │  │
│  │ - Email     │  │ - PostgreSQL│  │ - WebSocket         │  │
│  │ - OAuth     │  │ - favorites │  │ - Live sync         │  │
│  │ - Magic Link│  │ - users     │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                     GO BACKEND (Optional)                    │
│  ┌─────────────────┐                                        │
│  │  REST API       │  - Can be simplified or removed        │
│  │  - Trains/GTFS  │  - Supabase handles favorites directly │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Supabase Setup

### 1.1 Create Supabase Project

```bash
# Go to https://supabase.com and create account
# Create new project: "swiss-railway-live"
# Note down:
#   - Project URL: https://xxxxx.supabase.co
#   - Anon Key: eyJhbGciOiJIUzI1NiIs...
#   - Service Role Key: eyJhbGciOiJIUzI1NiIs... (keep secret!)
```

### 1.2 Install Supabase Client

```bash
cd frontend
npm install @supabase/supabase-js
```

### 1.3 Environment Variables

Create `frontend/.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: For server-side operations
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 1.4 Create Supabase Client

Create `frontend/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

---

## Phase 2: Database Schema

### 2.1 SQL Migration

Run in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users profile table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favorite Stations table
CREATE TABLE public.favorite_stations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  station_id TEXT NOT NULL,
  station_name TEXT NOT NULL,
  station_data JSONB, -- Full station object
  nickname TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate favorites per user
  UNIQUE(user_id, station_id)
);

-- Favorite Trains table
CREATE TABLE public.favorite_trains (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  train_id TEXT NOT NULL,
  train_name TEXT,
  train_data JSONB, -- Full train object snapshot
  nickname TEXT,
  notes TEXT,
  auto_follow BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate favorites per user
  UNIQUE(user_id, train_id)
);

-- Indexes for performance
CREATE INDEX idx_favorite_stations_user_id ON public.favorite_stations(user_id);
CREATE INDEX idx_favorite_trains_user_id ON public.favorite_trains(user_id);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_trains ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can view own station favorites" 
  ON public.favorite_stations FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own station favorites" 
  ON public.favorite_stations FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own station favorites" 
  ON public.favorite_stations FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own station favorites" 
  ON public.favorite_stations FOR DELETE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own train favorites" 
  ON public.favorite_trains FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own train favorites" 
  ON public.favorite_trains FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own train favorites" 
  ON public.favorite_trains FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own train favorites" 
  ON public.favorite_trains FOR DELETE 
  USING (auth.uid() = user_id);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_favorite_stations_updated_at
  BEFORE UPDATE ON public.favorite_stations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_favorite_trains_updated_at
  BEFORE UPDATE ON public.favorite_trains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2.2 Generate TypeScript Types

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Generate types
supabase gen types typescript --project-id your-project-id > frontend/src/types/supabase.ts
```

---

## Phase 3: Authentication

### 3.1 Auth Context Provider

Create `frontend/src/contexts/AuthContext.tsx`:

```typescript
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      signIn, signUp, signOut, signInWithGoogle
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

### 3.2 Login Component

Create `frontend/src/components/auth/LoginButton.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LogIn, LogOut, User } from 'lucide-react'

export function LoginButton() {
  const { user, loading, signInWithGoogle, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  if (loading) return null

  if (user) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
        >
          <User className="w-4 h-4" />
          <span className="text-sm">{user.email}</span>
        </button>
        
        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg">
            <button
              onClick={signOut}
              className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 inline mr-2" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={signInWithGoogle}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-800 hover:bg-gray-100"
    >
      <LogIn className="w-4 h-4" />
      Sign In
    </button>
  )
}
```

---

## Phase 4: API Integration

### 4.1 Supabase Favorites Service

Create `frontend/src/services/supabaseFavorites.ts`:

```typescript
import { supabase } from '@/lib/supabase'
import { Station, Train, Favorite, FavoriteTrain } from '@/types/railway'

// ==================== Station Favorites ====================

export async function getSupabaseStationFavorites(): Promise<Favorite[]> {
  const { data, error } = await supabase
    .from('favorite_stations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  return data.map(row => ({
    id: row.id,
    stationId: row.station_id,
    station: row.station_data as Station,
    nickname: row.nickname || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))
}

export async function addSupabaseStationFavorite(
  station: Station,
  nickname?: string,
  notes?: string
): Promise<Favorite> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('favorite_stations')
    .insert({
      user_id: user.id,
      station_id: station.id,
      station_name: station.name,
      station_data: station,
      nickname,
      notes
    })
    .select()
    .single()

  if (error) throw error

  return {
    id: data.id,
    stationId: data.station_id,
    station: data.station_data as Station,
    nickname: data.nickname || undefined,
    notes: data.notes || undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  }
}

export async function updateSupabaseStationFavorite(
  id: string,
  updates: { nickname?: string; notes?: string }
): Promise<Favorite> {
  const { data, error } = await supabase
    .from('favorite_stations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  return {
    id: data.id,
    stationId: data.station_id,
    station: data.station_data as Station,
    nickname: data.nickname || undefined,
    notes: data.notes || undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  }
}

export async function deleteSupabaseStationFavorite(id: string): Promise<void> {
  const { error } = await supabase
    .from('favorite_stations')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ==================== Train Favorites ====================

export async function getSupabaseTrainFavorites(): Promise<FavoriteTrain[]> {
  const { data, error } = await supabase
    .from('favorite_trains')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  return data.map(row => ({
    id: row.id,
    trainId: row.train_id,
    train: row.train_data as Train,
    nickname: row.nickname || undefined,
    notes: row.notes || undefined,
    autoFollow: row.auto_follow,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))
}

export async function addSupabaseTrainFavorite(
  train: Train,
  nickname?: string,
  notes?: string,
  autoFollow: boolean = true
): Promise<FavoriteTrain> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('favorite_trains')
    .insert({
      user_id: user.id,
      train_id: train.id,
      train_name: train.name,
      train_data: train,
      nickname,
      notes,
      auto_follow: autoFollow
    })
    .select()
    .single()

  if (error) throw error

  return {
    id: data.id,
    trainId: data.train_id,
    train: data.train_data as Train,
    nickname: data.nickname || undefined,
    notes: data.notes || undefined,
    autoFollow: data.auto_follow,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  }
}

// ... similar update and delete functions
```

### 4.2 Hybrid Storage (localStorage + Supabase)

Create `frontend/src/services/favoritesHybrid.ts`:

```typescript
import { useAuth } from '@/contexts/AuthContext'
import * as localStorage from './favoritesStorage'
import * as supabase from './supabaseFavorites'

/**
 * Hybrid Favorites Service
 * 
 * - If user is logged in: Use Supabase (with localStorage cache)
 * - If user is not logged in: Use localStorage only
 */

export function useFavoritesService() {
  const { user } = useAuth()

  return {
    // Station favorites
    getStationFavorites: user 
      ? supabase.getSupabaseStationFavorites 
      : localStorage.getStoredStationFavorites,
    
    addStationFavorite: user
      ? supabase.addSupabaseStationFavorite
      : localStorage.addStationFavorite,
    
    updateStationFavorite: user
      ? supabase.updateSupabaseStationFavorite
      : localStorage.updateStationFavorite,
    
    deleteStationFavorite: user
      ? supabase.deleteSupabaseStationFavorite
      : localStorage.deleteStationFavorite,

    // Train favorites
    getTrainFavorites: user
      ? supabase.getSupabaseTrainFavorites
      : localStorage.getStoredTrainFavorites,
    
    addTrainFavorite: user
      ? supabase.addSupabaseTrainFavorite
      : localStorage.addTrainFavorite,
    
    // ... etc
    
    // Sync utilities
    isAuthenticated: !!user,
    syncLocalToCloud: async () => {
      if (!user) return
      const local = localStorage.exportFavorites()
      // Merge local favorites to Supabase
      for (const station of local.stations) {
        await supabase.addSupabaseStationFavorite(
          station.station, 
          station.nickname, 
          station.notes
        ).catch(() => {}) // Ignore duplicates
      }
      for (const train of local.trains) {
        await supabase.addSupabaseTrainFavorite(
          train.train,
          train.nickname,
          train.notes,
          train.autoFollow
        ).catch(() => {})
      }
    }
  }
}
```

---

## Phase 5: Real-time Sync

### 5.1 Real-time Subscription

```typescript
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { Favorite } from '@/types/railway'

export function useRealtimeFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([])

  useEffect(() => {
    // Initial fetch
    fetchFavorites()

    // Subscribe to changes
    const subscription = supabase
      .channel('favorites_changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'favorite_stations' 
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setFavorites(prev => [...prev, transformRow(payload.new)])
          } else if (payload.eventType === 'UPDATE') {
            setFavorites(prev => 
              prev.map(f => f.id === payload.new.id ? transformRow(payload.new) : f)
            )
          } else if (payload.eventType === 'DELETE') {
            setFavorites(prev => prev.filter(f => f.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return favorites
}
```

---

## Phase 6: Migration Strategy

### 6.1 Migration Steps

1. **Deploy Supabase schema** (can be done immediately)
2. **Add Supabase client to frontend** (no breaking changes)
3. **Add auth UI** (optional login, app works without it)
4. **Enable hybrid mode** (localStorage for anonymous, Supabase for logged-in)
5. **Add "Sync to Cloud" prompt** for users with localStorage data

### 6.2 Migration Component

```typescript
export function MigrationPrompt() {
  const { user } = useAuth()
  const [hasLocalData, setHasLocalData] = useState(false)
  const [migrating, setMigrating] = useState(false)

  useEffect(() => {
    const local = localStorage.exportFavorites()
    setHasLocalData(local.stations.length > 0 || local.trains.length > 0)
  }, [])

  if (!user || !hasLocalData) return null

  const handleMigrate = async () => {
    setMigrating(true)
    await syncLocalToCloud()
    localStorage.clearAllFavorites()
    setHasLocalData(false)
    setMigrating(false)
  }

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-blue-500 text-white rounded-lg">
      <p>You have favorites saved locally. Sync to your account?</p>
      <button onClick={handleMigrate} disabled={migrating}>
        {migrating ? 'Syncing...' : 'Sync Now'}
      </button>
    </div>
  )
}
```

---

## Security Considerations

### Row Level Security (RLS)
- ✅ Users can only access their own favorites
- ✅ All tables have RLS enabled
- ✅ Policies enforce `auth.uid() = user_id`

### API Keys
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Safe for browser (limited by RLS)
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` - Server-side only, never expose to client

### Data Validation
- ✅ Database constraints (UNIQUE, NOT NULL)
- ✅ TypeScript types for compile-time safety
- ✅ Input sanitization before insert

---

## Cost Estimation

### Supabase Free Tier (Sufficient for Development)
- ✅ 500MB database
- ✅ 1GB file storage
- ✅ 50,000 monthly active users
- ✅ Unlimited API requests

### Supabase Pro ($25/month) - For Production
- 8GB database
- 100GB file storage
- Unlimited MAUs
- Daily backups
- Email support

---

## Implementation Checklist

- [ ] Create Supabase project
- [ ] Run database migrations
- [ ] Install `@supabase/supabase-js`
- [ ] Create environment variables
- [ ] Create Supabase client
- [ ] Generate TypeScript types
- [ ] Implement AuthContext
- [ ] Create login UI
- [ ] Implement Supabase favorites service
- [ ] Create hybrid storage service
- [ ] Add real-time subscriptions
- [ ] Create migration prompt
- [ ] Test authentication flow
- [ ] Test favorites CRUD
- [ ] Test real-time sync
- [ ] Deploy to production

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth with Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Real-time Subscriptions](https://supabase.com/docs/guides/realtime)
- [TypeScript Support](https://supabase.com/docs/guides/api/generating-types)

---

*Last Updated: December 2024*
