const apiKey = '0c23b158b013c7b7845ed5e115ee9847';
const showId = localStorage.getItem('selectedShowId');

async function fetchShowDetails() {
    try {
        const response = await fetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=${apiKey}&language=en-US`);
        const show = await response.json();

        document.getElementById('show_name').innerText = show.name;
        document.getElementById('overview').innerText = show.overview;
        document.getElementById('show_poster').src = `https://image.tmdb.org/t/p/w300${show.poster_path}`;
        document.getElementById('show_poster').alt = `${show.name} Poster`;

        const seriesRating = show.vote_average;
        document.getElementById('show_rating').innerText = seriesRating.toFixed(1);
        document.getElementById('show_rating').className = getRatingClass(seriesRating);

        // Filter out Season 0 (Specials) usually
        const seasons = show.seasons.filter(season => season.season_number !== 0);

        await buildHeatmap(seasons);

    } catch (error) {
        console.error('Error fetching show details:', error);
    }
}

async function buildHeatmap(seasons) {
    const chartContainer = document.getElementById('chart_container');
    chartContainer.innerHTML = '';

    // 1. Fetch all episode data for all seasons to find max episodes
    const seasonPromises = seasons.map(season =>
        fetch(`https://api.themoviedb.org/3/tv/${showId}/season/${season.season_number}?api_key=${apiKey}&language=en-US`)
            .then(res => res.json())
    );

    const fullSeasonsData = await Promise.all(seasonPromises);

    // Calculate max episodes in any single season to define grid width
    let maxEpisodes = 0;
    fullSeasonsData.forEach(seasonData => {
        if (seasonData.episodes && seasonData.episodes.length > maxEpisodes) {
            maxEpisodes = seasonData.episodes.length;
        }
    });

    // 2. Build Header Row (1, 2, 3 ... maxEpisodes)
    const headerRow = document.createElement('div');
    headerRow.className = 'chart-row header-row';

    // Empty corner cell for season labels column
    const cornerCell = document.createElement('div');
    cornerCell.className = 'label-cell corner';
    headerRow.appendChild(cornerCell);

    for (let i = 1; i <= maxEpisodes; i++) {
        const th = document.createElement('div');
        th.className = 'header-cell';
        th.innerText = i;
        headerRow.appendChild(th);
    }
    chartContainer.appendChild(headerRow);

    // 3. Build Season Rows
    fullSeasonsData.forEach(seasonData => {
        if (!seasonData.episodes || seasonData.episodes.length === 0) return;

        const row = document.createElement('div');
        row.className = 'chart-row';

        // Season Label (Left Y-Axis)
        const label = document.createElement('div');
        label.className = 'label-cell';
        label.innerText = seasonData.season_number;
        row.appendChild(label);

        // Episode Cells
        for (let i = 0; i < maxEpisodes; i++) {
            const cell = document.createElement('div');
            cell.className = 'episode-cell'; // Default empty/placeholder

            if (i < seasonData.episodes.length) {
                const ep = seasonData.episodes[i];
                cell.innerText = ep.vote_average.toFixed(1);
                cell.classList.add(getRatingClass(ep.vote_average));

                // Data attributes for tooltip
                cell.dataset.title = ep.name;
                cell.dataset.airDate = ep.air_date;
                cell.dataset.voteCount = ep.vote_count;
                cell.dataset.rating = ep.vote_average.toFixed(1);
                cell.dataset.episodeNum = `S${seasonData.season_number} E${ep.episode_number}`;

                // Event Listeners for Tooltip
                cell.addEventListener('mouseenter', (e) => showTooltip(e, cell.dataset));
                cell.addEventListener('mouseleave', hideTooltip);
            } else {
                // Empty cell padding for seasons with fewer episodes
                cell.classList.add('empty-cell');
            }

            row.appendChild(cell);
        }
        chartContainer.appendChild(row);
    });
}

// Tooltip Logic
const tooltip = document.getElementById('tooltip');

function showTooltip(e, data) {
    tooltip.innerHTML = `
        <strong>${data.title}</strong><br>
        <span class="sub-text">${data.airDate || 'Unknown Date'}</span><br>
        <span class="sub-text">${parseInt(data.voteCount).toLocaleString()} votes</span>
    `;
    tooltip.classList.remove('hidden');

    // Position logic
    const rect = e.target.getBoundingClientRect();
    tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`; // Above the cell
    tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`; // Centered
}

function hideTooltip() {
    tooltip.classList.add('hidden');
}


function getRatingClass(rating) {
    if (rating < 4.0) return 'rating-red';         // rgb(153, 0, 0) Red
    if (rating < 5.0) return 'rating-red-orange';   // rgb(204, 0, 0) Red-orange
    if (rating < 6.0) return 'rating-orange';       // rgb(204, 51, 0) Orange
    if (rating < 7.0) return 'rating-yellow-orange'; // rgb(204, 102, 0) Yellow-orange
    if (rating < 8.0) return 'rating-yellow';       // rgb(153, 153, 0) Yellow
    if (rating < 8.5) return 'rating-yellow-green'; // rgb(102, 153, 0) Yellow-green
    if (rating < 9.0) return 'rating-green-yellow'; // rgb(51, 153, 0) Green-yellow
    if (rating < 9.5) return 'rating-green';        // rgb(0, 153, 0) Green
    return 'rating-purple';                        // rgb(102, 0, 102) Purple
}

fetchShowDetails();
