import { useEffect, useState, useCallback } from 'react';
import { apiClient, type CampaignNote } from '../lib/apiClient';
import { ConfirmButton } from './ConfirmButton';

interface CampaignNotesProps {
  campaignId: number;
}

type NotesState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: CampaignNote[] };

export const CampaignNotes = ({ campaignId }: CampaignNotesProps) => {
  const [state, setState] = useState<NotesState>({ status: 'loading' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    content: '',
    author: '',
  });

  const loadNotes = useCallback(() => {
    setState({ status: 'loading' });
    apiClient
      .listCampaignNotes(campaignId)
      .then((data) =>
        setState({
          status: 'success',
          data: data.sort((a, b) => {
            const aPinned = a.pinned ? 1 : 0;
            const bPinned = b.pinned ? 1 : 0;
            if (aPinned !== bPinned) return bPinned - aPinned;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }),
        })
      )
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to load notes.';
        setState({ status: 'error', error: message });
      });
  }, [campaignId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const startEdit = (note: CampaignNote) => {
    setEditingId(note.id);
    setForm({
      content: note.content,
      author: note.author ?? '',
    });
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (editingId == null) return;
    const payload: { content?: string; author?: string | null } = {};
    if (form.content.trim()) payload.content = form.content.trim();
    payload.author = form.author.trim() === '' ? null : form.author.trim();
    await apiClient.patchNote(campaignId, editingId, payload);
    setEditingId(null);
    loadNotes();
  };

  const handleTogglePin = async (note: CampaignNote) => {
    await apiClient.patchNote(campaignId, note.id, {
      pinned: !note.pinned,
    });
    loadNotes();
  };

  const handleDelete = async (noteId: number) => {
    await apiClient.deleteNote(campaignId, noteId);
    loadNotes();
  };

  return (
    <section className="card">
      <h2>Notes</h2>
      {state.status === 'loading' && (
        <p className="status status-loading">Loading notes…</p>
      )}
      {state.status === 'error' && (
        <p className="status status-error">{state.error}</p>
      )}
      {state.status === 'success' && state.data.length === 0 && (
        <p className="status status-loading">
          No notes have been added for this campaign yet.
        </p>
      )}
      {state.status === 'success' && state.data.length > 0 && (
        <ul className="list">
          {state.data.map((note) => {
            const isEditing = editingId === note.id;
            const isPinned = Boolean(note.pinned);
            return (
              <li key={note.id}>
                <div className="list-item-row">
                  <button
                    type="button"
                    className={`list-item history-item ${isPinned ? 'active' : ''}`}
                    onClick={() => {
                      if (!isEditing) startEdit(note);
                    }}
                  >
                    <div className="history-item-header">
                      <span className="list-item-title">
                        {new Date(note.createdAt).toLocaleString()}
                      </span>
                      <div className="history-item-badges">
                        {isPinned && <span className="pill pill-ok">Pinned</span>}
                        {note.author && (
                          <span className="pill pill-muted">{note.author}</span>
                        )}
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="field">
                        <label className="field-label">Content</label>
                        <textarea
                          name="content"
                          value={form.content}
                          onChange={handleChange}
                        />
                        <label className="field-label">Author</label>
                        <input
                          name="author"
                          value={form.author}
                          onChange={handleChange}
                        />
                      </div>
                    ) : (
                      <span className="list-item-meta">{note.content}</span>
                    )}
                  </button>
                  <div className="list-item-controls">
                    <button
                      type="button"
                      className="button button-ghost button-xs"
                      onClick={() => handleTogglePin(note)}
                    >
                      {isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="button button-primary button-xs"
                          onClick={handleSave}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="button button-ghost button-xs"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="button button-ghost button-xs"
                          onClick={() => startEdit(note)}
                        >
                          Edit
                        </button>
                        <ConfirmButton
                          label="Delete"
                          confirmLabel="Confirm delete"
                          className="button button-danger button-xs"
                          onConfirm={() => handleDelete(note.id)}
                        />
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

