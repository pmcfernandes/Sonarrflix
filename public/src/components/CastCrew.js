import React from 'react';
import { h } from '../helpers/react.js';
import { fetchSeriesPeople, fetchMoviePeople } from '../helpers/api.js';

function PersonCard({ person }) {
  const photo = person.personImage || person.image || '';
  const displayName = person.personName || person.name || 'Unknown';
  const role = person.name && person.personName && person.name !== person.personName
    ? person.name
    : person.peopleType || '';

  return h(
    'div',
    { className: 'cast-card' },
    h(
      'div',
      { className: 'cast-avatar' },
      photo
        ? h('img', { src: photo, alt: displayName, loading: 'lazy' })
        : h('span', { className: 'cast-avatar-fallback' }, displayName.charAt(0).toUpperCase())
    ),
    h('strong', { className: 'cast-name' }, displayName),
    role ? h('span', { className: 'cast-role' }, role) : null
  );
}

function PeopleRail({ title, people }) {
  if (!people || people.length === 0) {
    return null;
  }

  return h(
    'div',
    { className: 'cast-section' },
    h('h3', { className: 'cast-section-title' }, title),
    h(
      'div',
      { className: 'cast-rail' },
      people.map((person, index) => h(PersonCard, { key: person.id || index, person }))
    )
  );
}

export function CastCrew({ id, type = 'series' }) {
  const [people, setPeople] = React.useState(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!id) {
      setLoaded(true);
      return;
    }

    let cancelled = false;
    const fetcher = type === 'movie' ? fetchMoviePeople : fetchSeriesPeople;

    fetcher(id)
      .then((data) => {
        if (!cancelled) {
          setPeople(data);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoaded(true);
        }
      });

    return () => { cancelled = true; };
  }, [id, type]);

  if (!loaded || !people) {
    return null;
  }

  const hasAny = (people.actors?.length || 0) + (people.directors?.length || 0) +
    (people.producers?.length || 0) + (people.creators?.length || 0) +
    (people.writers?.length || 0) > 0;

  if (!hasAny) {
    return null;
  }

  return h(
    'section',
    { className: 'cast-crew' },
    h(PeopleRail, { title: 'Cast', people: people.actors }),
    h(PeopleRail, { title: 'Creators', people: people.creators }),
    h(PeopleRail, { title: 'Directors', people: people.directors }),
    h(PeopleRail, { title: 'Producers', people: people.producers }),
    h(PeopleRail, { title: 'Writers', people: people.writers })
  );
}
