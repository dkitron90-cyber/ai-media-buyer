import type { Client } from '../lib/apiClient';

interface ClientListProps {
  clients: Client[];
  selectedClientId: number | null;
  onSelectClient: (clientId: number) => void;
  onEditClient: (client: Client) => void;
  onDeleteClient: (client: Client) => void;
}

export const ClientList = ({
  clients,
  selectedClientId,
  onSelectClient,
  onEditClient,
  onDeleteClient,
}: ClientListProps) => {
  if (!clients.length) {
    return <p className="status status-loading">No clients yet.</p>;
  }

  return (
    <ul className="list">
      {clients.map((client) => (
        <li key={client.id}>
          <div className="list-item-row">
            <button
              type="button"
              className={
                client.id === selectedClientId ? 'list-item active' : 'list-item'
              }
              onClick={() => onSelectClient(client.id)}
            >
              <span className="list-item-title">{client.name}</span>
              <span className="list-item-meta">
                ID {client.id} •{' '}
                {new Date(client.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </button>
            <div className="list-item-controls">
              <button
                type="button"
                className="button button-ghost button-xs"
                onClick={() => onEditClient(client)}
              >
                Edit
              </button>
              <button
                type="button"
                className="button button-danger button-xs"
                onClick={() => onDeleteClient(client)}
              >
                Delete
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

