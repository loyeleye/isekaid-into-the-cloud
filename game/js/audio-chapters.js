// Recorded music and sound effects for Chapters 2 to 6 (OpenGameArt, credited in CREDITS.md), added through
// SD.audio.add so js/audio.js stays as it is. Each chapter's places call these keys with SD.audio.music(key); the
// x- samples play with SD.audio.sfx('x-stamp') and so on. Every key here has its file in assets/audio, so none
// needs a fallback (audio.js keeps its FALLBACK table private; a key whose file failed to load just stays quiet).
(function () {
  if (!window.SD || !SD.audio || !SD.audio.add) return;
  SD.audio.add({
    songs: {
      // Chapter 2, part A: the Sorting Floors and their two bosses (Expedition I).
      c2dungeon: 'm-c2-dungeon', c2boss: 'm-c2-boss',
      // Chapter 2, part B: Thornwick under Nothing Arrives, the Dead Letter Office, Grand Inquisitor Hale, the Prayer Vault.
      c2xtown: 'm-c2x-town', c2xexplore: 'm-c2x-explore', c2xdungeon: 'm-c2x-dungeon', c2xboss: 'm-c2x-boss',
      c2xculprit: 'm-c2x-culprit', c2xsad: 'm-c2x-sad', c2xvault: 'm-c2x-vault',
      // Chapter 3: Halcyon and the Granaries, Princess Selvaria, Wen's Cache Café.
      c3town: 'm-c3-town', c3explore: 'm-c3-explore', c3dungeon: 'm-c3-dungeon', c3boss: 'm-c3-boss',
      c3culprit: 'm-c3-culprit', c3sad: 'm-c3-sad', c3cafe: 'm-c3-cafe',
      // Chapter 4: the Alliance's sealed mountains, Namgung Hyeon, Burning Peak.
      c4town: 'm-c4-town', c4explore: 'm-c4-explore', c4dungeon: 'm-c4-dungeon', c4boss: 'm-c4-boss',
      c4culprit: 'm-c4-culprit', c4sad: 'm-c4-sad', c4peak: 'm-c4-peak',
      // Chapter 5: the Arcanum's machine floors, Iris Vell, the clocktower race.
      c5town: 'm-c5-town', c5explore: 'm-c5-explore', c5dungeon: 'm-c5-dungeon', c5boss: 'm-c5-boss',
      c5culprit: 'm-c5-culprit', c5sad: 'm-c5-sad', c5clock: 'm-c5-clock',
      // Chapter 6: Twinwater on the Mirror Floors, Kagemaru, the lake.
      c6town: 'm-c6-town', c6explore: 'm-c6-explore', c6dungeon: 'm-c6-dungeon', c6boss: 'm-c6-boss',
      c6culprit: 'm-c6-culprit', c6sad: 'm-c6-sad', c6mirror: 'm-c6-mirror'
    },
    samples: {
      // General-purpose effects any chapter can use (the list chapter helpers see is in overnight/audio-requests.md).
      'x-stamp': 's-x-stamp', 'x-page': 's-x-page', 'x-lock': 's-x-lock', 'x-lever': 's-x-lever',
      'x-bell': 's-x-bell', 'x-chime': 's-x-chime', 'x-crowd': 's-x-crowd', 'x-tick': 's-x-tick'
    }
  });
})();
