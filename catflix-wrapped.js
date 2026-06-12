// Catflix Wrapped - Jellyfin JS Injector Script

(function () {
    const SERVER_URL = 'https://alkoholisterna.asuscomm.com';
    const API_KEY = 'c99e8c988719426dbd8c1b4a66d52382'; // <-- paste your API key here

    const WRAPPED_SVG = `<svg width="18" height="18" viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
        <rect x="10" y="40" width="80" height="55" rx="5"/>
        <rect x="10" y="25" width="80" height="18" rx="4"/>
        <rect x="43" y="10" width="14" height="32" rx="4"/>
        <rect x="25" y="5" width="22" height="24" rx="10"/>
        <rect x="53" y="5" width="22" height="24" rx="10"/>
        <rect x="43" y="40" width="14" height="55"/>
    </svg>`;

    function injectWrappedLink() {
        if (document.getElementById('catflix-wrapped-btn')) return;
        const section = document.getElementById('catflix-nav-section');
        if (!section) return;
        const settingsBtn = document.getElementById('catflix-settings-btn');
        if (!settingsBtn) return;

        const link = document.createElement('a');
        link.id = 'catflix-wrapped-btn';
        link.className = 'navMenuOption lnkMediaFolder emby-button';
        link.href = '#';
        link.style.cssText = 'display:flex;align-items:center;gap:0;';
        link.innerHTML = `
            <span class="navMenuOptionIcon" style="display:flex;align-items:center;justify-content:center;">${WRAPPED_SVG}</span>
            <span class="navMenuOptionText">Catflix Wrapped</span>
        `;
        link.addEventListener('click', e => { e.preventDefault(); showWrappedPage(); });
        section.insertBefore(link, settingsBtn);
    }

    function getSessionAuth() {
        const keys = Object.keys(localStorage).filter(k => k.includes('_credentials'));
        for (const k of keys) {
            try {
                const creds = JSON.parse(localStorage.getItem(k));
                if (creds?.AccessToken) return { userId: creds.User?.Id, userName: creds.User?.Name };
            } catch {}
        }
        if (window.ApiClient) return { userId: window.ApiClient.getCurrentUserId(), userName: null };
        return null;
    }

    async function apiFetch(path, options = {}) {
        const res = await fetch(`${SERVER_URL}${path}`, {
            ...options,
            headers: {
                'Authorization': `MediaBrowser Token="${API_KEY}"`,
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        });
        if (!res.ok) throw new Error(`API ${res.status} on ${path}`);
        return res.json();
    }

    async function customQuery(sql) {
        return apiFetch('/user_usage_stats/submit_custom_query', {
            method: 'POST',
            body: JSON.stringify({ CustomQueryString: sql, ReplaceUserId: false })
        });
    }

    async function fetchUserName(userId) {
        try { return (await apiFetch(`/Users/${userId}`)).Name || 'You'; }
        catch { return 'You'; }
    }

    // Fetch item metadata (SeriesName + Genres) for a list of ItemIds
    async function fetchItemMetadata(itemIds) {
        if (!itemIds.length) return {};
        try {
            const ids = [...new Set(itemIds)].join(',');
            const data = await apiFetch(`/Items?Ids=${ids}&Fields=Genres,SeriesName,ParentId&Recursive=true&EnableTotalRecordCount=false`);
            const map = {};
            (data.Items || []).forEach(item => {
                map[item.Id] = {
                    seriesName: item.SeriesName || item.Name || null,
                    genres: item.Genres || []
                };
            });
            // For episodes with no genres, try to get genres from series
            const seriesIds = [...new Set(
                (data.Items || [])
                    .filter(item => item.Type === 'Episode' && (!item.Genres || !item.Genres.length) && item.SeriesId)
                    .map(item => item.SeriesId)
            )];
            if (seriesIds.length) {
                const seriesData = await apiFetch(`/Items?Ids=${seriesIds.join(',')}&Fields=Genres&Recursive=true&EnableTotalRecordCount=false`);
                const seriesGenreMap = {};
                (seriesData.Items || []).forEach(s => { seriesGenreMap[s.Id] = s.Genres || []; });
                (data.Items || []).forEach(item => {
                    if (item.Type === 'Episode' && item.SeriesId && seriesGenreMap[item.SeriesId]) {
                        map[item.Id].genres = seriesGenreMap[item.SeriesId];
                    }
                });
            }
            return map;
        } catch { return {}; }
    }

    async function loadStats(userId, year) {
        const start = `${year}-01-01 00:00:00`;
        const end   = `${year}-12-31 23:59:59`;

        const [totals, movies, episodes] = await Promise.all([
            customQuery(`SELECT COUNT(1), SUM(PlayDuration) FROM PlaybackActivity WHERE UserId='${userId}' AND DateCreated >= '${start}' AND DateCreated <= '${end}'`),
            customQuery(`SELECT ItemId, ItemName, COUNT(1), SUM(PlayDuration) FROM PlaybackActivity WHERE UserId='${userId}' AND ItemType='Movie' AND DateCreated >= '${start}' AND DateCreated <= '${end}' GROUP BY ItemId ORDER BY SUM(PlayDuration) DESC LIMIT 20`),
            customQuery(`SELECT ItemId, ItemName, COUNT(1), SUM(PlayDuration) FROM PlaybackActivity WHERE UserId='${userId}' AND ItemType='Episode' AND DateCreated >= '${start}' AND DateCreated <= '${end}' GROUP BY ItemId ORDER BY SUM(PlayDuration) DESC LIMIT 50`)
        ]);

        const movieRows   = movies.results   || [];
        const episodeRows = episodes.results || [];

        // Fetch metadata for all items at once
        const allIds = [
            ...movieRows.map(r => r[0]),
            ...episodeRows.map(r => r[0])
        ].filter(Boolean);

        const metaMap = await fetchItemMetadata(allIds);

        // Aggregate movies by name with genres
        const movieAgg = {};
        const genreAgg = {};

        movieRows.forEach(r => {
            const name = r[1];
            const meta = metaMap[r[0]] || {};
            if (!movieAgg[name]) movieAgg[name] = { plays: 0, duration: 0 };
            movieAgg[name].plays    += parseInt(r[2]) || 0;
            movieAgg[name].duration += parseInt(r[3]) || 0;
            (meta.genres || []).forEach(g => {
                genreAgg[g] = (genreAgg[g] || 0) + (parseInt(r[3]) || 0);
            });
        });

        // Aggregate episodes by series name with genres
        const seriesAgg = {};
        episodeRows.forEach(r => {
            const meta = metaMap[r[0]] || {};
            const seriesName = meta.seriesName || r[1];
            if (!seriesAgg[seriesName]) seriesAgg[seriesName] = { episodes: 0, duration: 0 };
            seriesAgg[seriesName].episodes += parseInt(r[2]) || 0;
            seriesAgg[seriesName].duration += parseInt(r[3]) || 0;
            (meta.genres || []).forEach(g => {
                genreAgg[g] = (genreAgg[g] || 0) + (parseInt(r[3]) || 0);
            });
        });

        const topMovies = Object.entries(movieAgg)
            .sort((a, b) => b[1].duration - a[1].duration)
            .slice(0, 5)
            .map(([name, d]) => [name, d.plays, d.duration]);

        const topShows = Object.entries(seriesAgg)
            .sort((a, b) => b[1].duration - a[1].duration)
            .slice(0, 5)
            .map(([name, d]) => [name, d.episodes, d.duration]);

        const topGenres = Object.entries(genreAgg)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, secs]) => [name, secs]);

        return {
            totalPlays:   parseInt(totals.results?.[0]?.[0]) || 0,
            totalSeconds: parseInt(totals.results?.[0]?.[1]) || 0,
            topMovies,
            topShows,
            topGenres
        };
    }

    function fmtDuration(secs) {
        if (!secs) return '0m';
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }

    function fmtDays(secs) { return (secs / 86400).toFixed(1); }

    function renderList(items, subFn) {
        if (!items.length) return '<div style="color:#7a5a6a;font-size:0.85rem;margin-top:14px;">Nothing yet.</div>';
        const maxVal = items[0][2] || 1;
        return `<ul style="list-style:none;margin:14px 0 0;padding:0;display:flex;flex-direction:column;gap:12px;">
            ${items.map((item, i) => {
                const pct = Math.round((item[2] / maxVal) * 100);
                return `<li style="display:flex;align-items:center;gap:14px;">
                    <span style="font-size:1.3rem;font-weight:800;color:#C9607A;min-width:28px;">${i+1}</span>
                    <div style="flex:1;">
                        <div style="font-size:0.9rem;font-weight:600;color:#f0e6d3;">${item[0]}</div>
                        <div style="font-size:0.78rem;color:#7a5a6a;">${subFn(item)}</div>
                        <div style="height:3px;background:#2a1a3a;border-radius:2px;margin-top:5px;">
                            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#C9607A,#e8a0b0);border-radius:2px;"></div>
                        </div>
                    </div>
                </li>`;
            }).join('')}
        </ul>`;
    }

    function renderStats(stats, userName, year) {
        const hasData = stats.totalPlays > 0;
        return `
        <div style="text-align:center;padding:50px 40px 30px;">
            <div style="font-size:clamp(2.2rem,5vw,4.5rem);font-weight:800;line-height:1;margin-bottom:10px;
                background:linear-gradient(135deg,#C9607A,#e8a0b0,#f0e6d3);
                -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">
                ${userName}'s ${year}
            </div>
            <div style="color:#9a7a8a;font-size:1rem;">
                ${hasData ? `Here's what you watched this year ` : `No watch data found for ${year} yet.`}
            </div>
        </div>

        ${!hasData ? `
            <div style="text-align:center;padding:40px;color:#7a5a6a;">
                 No playback data for ${year}.<br>
                Playback Reporting only logs from the moment it was installed.
            </div>
        ` : `
        <div class="cw-row" style="padding:10px 36px 0;">
            <div class="cw-card">
                <div class="cw-card-icon">⏱️</div>
                <div class="cw-card-label">Total Watch Time</div>
                <div class="cw-card-value">${fmtDuration(stats.totalSeconds)}</div>
                <div class="cw-card-sub">That's ${fmtDays(stats.totalSeconds)} days on Catflix </div>
            </div>
            <div class="cw-card">
                <div class="cw-card-icon">▶️</div>
                <div class="cw-card-label">Total Plays</div>
                <div class="cw-card-value">${stats.totalPlays}</div>
                <div class="cw-card-sub">${stats.topMovies.length} movies · ${stats.topShows.length} shows tracked</div>
            </div>
            <div class="cw-card">
                <div class="cw-card-icon"></div>
                <div class="cw-card-label">Most Watched Show</div>
                <div class="cw-card-value" style="font-size:1.2rem;line-height:1.3;">${stats.topShows[0]?.[0] || '—'}</div>
                <div class="cw-card-sub">${stats.topShows[0] ? fmtDuration(stats.topShows[0][2]) + ' · ' + stats.topShows[0][1] + ' episodes' : 'No shows yet'}</div>
            </div>
        </div>

        <div class="cw-row" style="padding:18px 36px 60px;">
            <div class="cw-card">
                <div class="cw-card-icon"></div>
                <div class="cw-card-label">Top Movies</div>
                ${renderList(stats.topMovies, item => fmtDuration(item[2]))}
            </div>
            <div class="cw-card">
                <div class="cw-card-icon">⭐</div>
                <div class="cw-card-label">Top Shows</div>
                ${renderList(stats.topShows, item => fmtDuration(item[2]) + ' · ' + item[1] + ' ep')}
            </div>
            <div class="cw-card">
                <div class="cw-card-icon"></div>
                <div class="cw-card-label">Top Genres</div>
                <div style="margin-top:14px;">
                    ${stats.topGenres.length ? stats.topGenres.map((g, i) => `
                        <span style="display:inline-block;margin:4px;padding:6px 14px;border-radius:20px;font-size:0.85rem;
                            background:${i===0?'#3a1a2a':'#2a1a3a'};
                            border:1px solid ${i===0?'#C9607A':'#3a2a4a'};
                            color:${i===0?'#C9607A':'#c0a0b0'};
                            font-weight:${i===0?'600':'400'};">
                            ${i===0?'&#x1F451; ':''}${g[0]}
                        </span>
                    `).join('') : '<div style="color:#7a5a6a;font-size:0.85rem;">No genre data yet.</div>'}
                </div>
            </div>
        </div>`}`;
    }

    async function showWrappedPage() {
        const existing = document.getElementById('catflix-wrapped-overlay');
        if (existing) existing.remove();

        const session = getSessionAuth();
        if (!session) { alert('Could not get session. Are you logged in?'); return; }

        const currentYear = new Date().getFullYear();
        const years = [];
        for (let y = currentYear; y >= 2026; y--) years.push(y);

        const overlay = document.createElement('div');
        overlay.id = 'catflix-wrapped-overlay';
        overlay.innerHTML = `
        <style>
            #catflix-wrapped-overlay {
                position:fixed;inset:0;z-index:9999;
                background:#0d0d14;overflow-y:auto;
                font-family:'DM Sans',sans-serif;color:#f0e6d3;
            }
            #catflix-wrapped-overlay * { box-sizing:border-box; }
            .cw-card {
                background:#16111f;border:1px solid #2a1a3a;border-radius:16px;padding:26px;
                position:relative;overflow:hidden;
            }
            .cw-card::before {
                content:'';position:absolute;top:0;left:0;right:0;height:3px;
                background:linear-gradient(90deg,#C9607A,#9a4060);
            }
            .cw-card-icon { font-size:1.8rem;margin-bottom:10px; }
            .cw-card-label { font-size:0.72rem;text-transform:uppercase;letter-spacing:1.5px;color:#9a7a8a;margin-bottom:6px; }
            .cw-card-value { font-size:2rem;font-weight:800;color:#f0e6d3;line-height:1;margin-bottom:4px; }
            .cw-card-sub { font-size:0.82rem;color:#7a5a6a; }
            .cw-year-btn {
                background:none;border:1px solid #3a2a4a;color:#f0e6d3;
                padding:5px 13px;border-radius:16px;cursor:pointer;
                font-family:inherit;font-size:0.82rem;transition:all 0.2s;
            }
            .cw-year-btn:hover,.cw-year-btn.active { background:#C9607A;border-color:#C9607A;color:white; }
            .cw-spinner { font-size:2.5rem;display:inline-block;animation:cw-bounce 0.8s infinite alternate; }
            @keyframes cw-bounce { from{transform:translateY(0)} to{transform:translateY(-10px)} }
            .cw-row { display:grid;grid-template-columns:repeat(3,1fr);gap:18px;max-width:1100px;margin:0 auto; }
            @media (max-width:700px) { .cw-row { grid-template-columns:1fr !important; } }
        </style>

        <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 36px;border-bottom:1px solid #2a2035;flex-wrap:wrap;gap:12px;">
            <div style="font-size:1.4rem;font-weight:800;color:#C9607A;"> Catflix Wrapped</div>
            <div style="display:flex;align-items:center;gap:10px;">
                <div id="cw-year-btns" style="display:flex;gap:6px;"></div>
                <button id="cw-close" style="background:none;border:1px solid #3a2a4a;color:#f0e6d3;padding:7px 16px;border-radius:20px;cursor:pointer;font-family:inherit;font-size:0.85rem;">✕ Close</button>
            </div>
        </div>
        <div id="cw-body" style="min-height:400px;"></div>`;

        document.body.appendChild(overlay);
        document.getElementById('cw-close').addEventListener('click', () => overlay.remove());

        const yearBtns = document.getElementById('cw-year-btns');
        years.forEach(y => {
            const btn = document.createElement('button');
            btn.className = 'cw-year-btn' + (y === currentYear ? ' active' : '');
            btn.textContent = y;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.cw-year-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                loadYear(session, y);
            });
            yearBtns.appendChild(btn);
        });

        loadYear(session, currentYear);
    }

    async function loadYear(session, year) {
        const body = document.getElementById('cw-body');
        body.innerHTML = `<div style="text-align:center;padding:80px 40px;color:#9a7a8a;">
            <span class="cw-spinner"></span><br><br>Loading ${year}...
        </div>`;
        try {
            const [stats, userName] = await Promise.all([
                loadStats(session.userId, year),
                fetchUserName(session.userId)
            ]);
            body.innerHTML = renderStats(stats, userName, year);
        } catch(err) {
            body.innerHTML = `<div style="margin:30px 36px;padding:16px 20px;background:#2a1010;border:1px solid #5a2020;border-radius:12px;color:#e08080;font-size:0.85rem;">❌ ${err.message}</div>`;
        }
    }

    new MutationObserver(() => injectWrappedLink()).observe(document.body, { childList: true, subtree: true });
    setTimeout(injectWrappedLink, 1000);

})();
