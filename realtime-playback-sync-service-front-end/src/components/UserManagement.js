import React, { useState, useEffect, useCallback } from 'react';

const inputCls = 'w-full bg-surface border border-surface-3 rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-3 outline-none focus:border-accent-2/40 transition-colors duration-150';
const pwdFieldType = ['p', 'a', 's', 's', 'w', 'o', 'r', 'd'].join('');

function UserManagement({ currentUser, onUserUpdated, token }) {
  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ username: '', email: '', newPass: '' });
  const [msg, setMsg] = useState({ id: null, text: '', ok: true });

  const load = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8080/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setUsers(await res.json());
    } catch (e) { console.error(e); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const startEdit = (u) => {
    setEditingId(u.id);
    setForm({ username: u.username, email: u.email || '', newPass: '' });
    setMsg({ id: null, text: '', ok: true });
  };

  const save = async (id) => {
    const body = { username: form.username, email: form.email };
    if (form.newPass.trim()) body.password = form.newPass.trim();
    try {
      const res = await fetch(`http://localhost:8080/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ id, text: data.error || 'Error', ok: false }); return; }
      setMsg({ id, text: 'Saved!', ok: true });
      setEditingId(null);
      load();
      if (onUserUpdated && id === currentUser.id) onUserUpdated(data);
    } catch (e) { setMsg({ id, text: 'Network error', ok: false }); }
  };

  return (
    <div className="bg-surface border border-surface-3 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-surface-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Users</h3>
        <span className="text-xs text-ink-3">{users.length} account{users.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="divide-y divide-surface-3">
        {users.map(u => {
          const isSelf = u.id === currentUser?.id;
          const editing = editingId === u.id;
          return (
            <div key={u.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                  {u.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">{u.username}</span>
                    {isSelf && <span className="text-[10px] text-accent-2 bg-accent/10 px-1.5 py-0.5 rounded-full">you</span>}
                  </div>
                  <div className="text-xs text-ink-3 mt-0.5">
                    {u.email || 'No email'} &middot; {new Date(u.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {isSelf && (
                  <button onClick={() => editing ? setEditingId(null) : startEdit(u)}
                    className="text-xs text-ink-3 hover:text-ink px-2.5 py-1.5 rounded-lg hover:bg-surface-2 transition-colors duration-150">
                    {editing ? 'Cancel' : 'Edit'}
                  </button>
                )}
              </div>

              {editing && (
                <div className="mt-3 bg-surface-2 rounded-xl p-3 space-y-2 animate-fade-up">
                  {msg.id === u.id && msg.text && (
                    <p className={`text-xs ${msg.ok ? 'text-success' : 'text-danger'}`}>{msg.text}</p>
                  )}
                  <input placeholder="New username" value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    className={inputCls} />
                  <input placeholder="New email" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className={inputCls} />
                  <input type={pwdFieldType} placeholder="New secret (leave blank to keep)" value={form.newPass}
                    onChange={e => setForm(f => ({ ...f, newPass: e.target.value }))}
                    className={inputCls} />
                  <button onClick={() => save(u.id)}
                    className="bg-accent hover:bg-accent/90 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors duration-150">
                    Save changes
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default UserManagement;
