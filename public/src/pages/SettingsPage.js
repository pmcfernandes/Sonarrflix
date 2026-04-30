import React from 'react';
import { saveSettings, testSettings } from '../helpers/api.js';
import { h } from '../helpers/react.js';

export function SettingsPage({ initialSettings, onSaved }) {
  const [form, setForm] = React.useState({
    sonarrUrl: initialSettings?.sonarrUrl || 'http://localhost:8989',
    sonarrApiKey: initialSettings?.sonarrApiKey || ''
  });
  const [message, setMessage] = React.useState(initialSettings?.connectionError || '');
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);

  React.useEffect(() => {
    setForm({
      sonarrUrl: initialSettings?.sonarrUrl || 'http://localhost:8989',
      sonarrApiKey: initialSettings?.sonarrApiKey || ''
    });
    setMessage(initialSettings?.connectionError || '');
  }, [initialSettings]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleTest() {
    setTesting(true);
    setMessage('');

    try {
      await testSettings(form);
      setMessage('Connection successful.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setTesting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const savedSettings = await saveSettings(form);
      setMessage('Settings saved.');
      onSaved(savedSettings);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  return h(
    'section',
    { className: 'settings-page' },
    h(
      'form',
      { className: 'settings-form', onSubmit: handleSubmit },
      h('p', { className: 'eyebrow' }, 'Application setup'),
      h('h2', null, 'Sonarr settings'),
      h(
        'label',
        { className: 'settings-field' },
        h('span', null, 'Sonarr URL'),
        h('input', {
          type: 'url',
          value: form.sonarrUrl,
          placeholder: 'http://localhost:8989',
          required: true,
          onChange: (event) => updateField('sonarrUrl', event.target.value)
        })
      ),
      h(
        'label',
        { className: 'settings-field' },
        h('span', null, 'Sonarr API key'),
        h('input', {
          type: 'password',
          value: form.sonarrApiKey,
          required: true,
          onChange: (event) => updateField('sonarrApiKey', event.target.value)
        })
      ),
      message ? h('div', { className: 'settings-message', role: 'status' }, message) : null,
      h(
        'div',
        { className: 'settings-actions' },
        h('button', { type: 'button', onClick: handleTest, disabled: testing || saving }, testing ? 'Testing...' : 'Test'),
        h('button', { type: 'submit', disabled: saving || testing }, saving ? 'Saving...' : 'Save')
      )
    )
  );
}
