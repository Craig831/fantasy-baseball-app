/**
 * LineupEditor Component
 * Container component for creating and editing lineups
 * Handles lineup state, player selection, and validation
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLineup,
  createLineup,
  updateLineup,
  CreateLineupDto,
  UpdateLineupDto,
  LineupSlot as LineupSlotType,
} from '../../services/lineupService';
import { LineupSlot } from './LineupSlot';
import { useNavigate } from 'react-router-dom';

interface LineupEditorProps {
  lineupId?: string; // If provided, editing existing lineup
}

export const LineupEditor: React.FC<LineupEditorProps> = ({ lineupId }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = !!lineupId;

  // State
  const [name, setName] = useState('');
  const [gameDate, setGameDate] = useState('');
  const [slots, setSlots] = useState<LineupSlotType[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch existing lineup if editing
  const { data: existingLineup, isLoading: isLoadingLineup } = useQuery({
    queryKey: ['lineup', lineupId],
    queryFn: () => getLineup(lineupId!),
    enabled: isEditMode,
  });

  // Initialize slots when lineup loads
  useEffect(() => {
    if (existingLineup) {
      setName(existingLineup.name);
      setGameDate(existingLineup.gameDate || '');
      setSlots(existingLineup.slots);
    } else if (!isEditMode) {
      // Create empty slots for new lineup
      const emptySlots: LineupSlotType[] = Array.from({ length: 25 }, (_, i) => ({
        id: `temp-${i}`,
        lineupId: '',
        slotOrder: i + 1,
        playerId: null,
        player: undefined,
        projectedScore: 0,
        actualScore: null,
        locked: false,
        createdAt: '',
        updatedAt: '',
      }));
      setSlots(emptySlots);
    }
  }, [existingLineup, isEditMode]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createLineup,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lineups'] });
      navigate(`/lineups/${data.id}`);
    },
    onError: (error: any) => {
      setErrors({ submit: error.response?.data?.message || error.message });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateLineupDto }) =>
      updateLineup(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lineups'] });
      queryClient.invalidateQueries({ queryKey: ['lineup', lineupId] });
      navigate(`/lineups/${data.id}`);
    },
    onError: (error: any) => {
      setErrors({ submit: error.response?.data?.message || error.message });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Lineup name is required';
    } else if (name.length > 100) {
      newErrors.name = 'Lineup name must be 100 characters or less';
    }

    // Check for duplicate players
    const playerIds = slots
      .map((s) => s.playerId)
      .filter((id): id is string => id !== null);
    const uniquePlayerIds = new Set(playerIds);
    if (uniquePlayerIds.size !== playerIds.length) {
      newErrors.slots = 'Lineup cannot contain duplicate players';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (isEditMode && lineupId) {
      // Update existing lineup
      const dto: UpdateLineupDto = {
        name,
        slots: slots.map((slot) => ({
          slotOrder: slot.slotOrder,
          playerId: slot.playerId,
        })),
      };
      updateMutation.mutate({ id: lineupId, dto });
    } else {
      // Create new lineup
      const dto: CreateLineupDto = {
        name,
        ...(gameDate && { gameDate }),
      };
      createMutation.mutate(dto);
    }
  };

  const handlePlayerRemove = (slotOrder: number) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.slotOrder === slotOrder ? { ...slot, playerId: null, player: undefined } : slot
      )
    );
  };

  const handlePlayerSelect = (slotOrder: number) => {
    // TODO: Open player selection modal
    // For now, just a placeholder
    alert(`Player selection for slot ${slotOrder} - to be implemented with player search modal`);
  };

  const handleCancel = () => {
    navigate('/lineups');
  };

  if (isLoadingLineup) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-gray-600">Loading lineup...</div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <form className="px-4 py-5 sm:p-6" onSubmit={handleSubmit}>
        <div className="space-y-6">
          <div>
            <label htmlFor="lineup-name" className="block text-sm font-medium text-gray-700">
              Lineup Name *
            </label>
            <input
              type="text"
              id="lineup-name"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="e.g., My Dream Team"
              aria-required="true"
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <div className="mt-2 text-sm text-red-600">{errors.name}</div>
            )}
          </div>

          <div>
            <label htmlFor="lineup-date" className="block text-sm font-medium text-gray-700">
              Game Date (Optional)
            </label>
            <input
              type="date"
              id="lineup-date"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Players ({slots.filter((s) => s.player).length} / 25)
          </h3>
          {errors.slots && (
            <div className="mb-4 text-sm text-red-600">{errors.slots}</div>
          )}
          <div className="space-y-2">
            {slots.map((slot) => (
              <LineupSlot
                key={slot.slotOrder}
                slot={slot}
                onPlayerSelect={handlePlayerSelect}
                onPlayerRemove={handlePlayerRemove}
                isEditable={true}
                showScore={false}
              />
            ))}
          </div>
        </div>

        {errors.submit && (
          <div className="mt-4 text-sm text-red-600">
            {errors.submit}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end space-x-3">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'Saving...'
              : isEditMode
              ? 'Update Lineup'
              : 'Create Lineup'}
          </button>
        </div>
      </form>
    </div>
  );
};
