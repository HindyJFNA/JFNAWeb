document.addEventListener('DOMContentLoaded', function () {
    // Configuration for the logger
    const LOG_CONFIG = {
        // Possible values: 'debug', 'info', 'warn', 'error', 'none'
        logLevel: 'info',
        prefix: '[FedFinder]'
    };

    // Pre-define the desired starting viewpoint for North America
    const INITIAL_VIEW = {
        longitude: -96,
        latitude: 45,
        zoom: 2.6
    };


    // Logger utility that respects log level
    const Logger = {
        debug: function (...args) {
            if (this._shouldLog('debug')) {
                console.log(LOG_CONFIG.prefix, ...args);
            }
        },
        info: function (...args) {
            if (this._shouldLog('info')) {
                console.log(LOG_CONFIG.prefix, ...args);
            }
        },
        warn: function (...args) {
            if (this._shouldLog('warn')) {
                console.warn(LOG_CONFIG.prefix, ...args);
            }
        },
        error: function (...args) {
            if (this._shouldLog('error')) {
                console.error(LOG_CONFIG.prefix, ...args);
            }
        },
        _shouldLog: function (level) {
            const levels = {'debug': 0, 'info': 1, 'warn': 2, 'error': 3, 'none': 4};
            return levels[level] >= levels[LOG_CONFIG.logLevel];
        }
    };

    // FedFinder Analytics Helper
    window.trackFedFinderEvent = function(eventName, params = {}) {
        // Use GA4 gtag if available
        if (typeof gtag === 'function') {
            gtag('event', eventName, {
                event_category: 'FedFinder',
                ...params
            });
            Logger.info('Analytics event:', eventName, params);
        } else {
            Logger.info('Analytics event (mock):', eventName, params);
        }
    };

    // DOM Helper Utilities
    const DOMHelpers = {
        // Find an element in the DOM
        find: function (selector) {
            return document.querySelector(selector);
        },

        // Find all elements matching a selector
        findAll: function (selector) {
            return document.querySelectorAll(selector);
        },

        // Show an element (make it visible)
        show: function (selector) {
            const element = typeof selector === 'string' ? this.find(selector) : selector;
            if (element) {
                element.style.display = 'block';
            }
        },

        // Hide an element (make it invisible)
        hide: function (selector) {
            const element = typeof selector === 'string' ? this.find(selector) : selector;
            if (element) {
                element.style.display = 'none';
            }
        },

        // Empty an element's contents
        empty: function (selector) {
            const element = typeof selector === 'string' ? this.find(selector) : selector;
            if (element) {
                element.innerHTML = '';
            }
        },

        // Set or get the value of an input
        val: function (selector, value) {
            const element = typeof selector === 'string' ? this.find(selector) : selector;
            if (element) {
                if (value !== undefined) {
                    element.value = value;
                    return value;
                } else {
                    return element.value;
                }
            }
            return '';
        }
    };

    Logger.info('Ready');
    // Initialize UI state - show welcome message, hide others
    DOMHelpers.show(".finder-message.welcome");
    DOMHelpers.hide(".finder-message.no-result");
    DOMHelpers.hide(".finder-message.loading");
    DOMHelpers.hide(".finder-results");

    // Global variable to store all federation data
    var allFederations = [];
    var dataVersion = null;

    // Function to check if we have valid cached data
    function hasValidCache() {
        try {
            // Check if we have cached data
            var cachedData = localStorage.getItem('fedFinder_data');
            var cachedVersion = localStorage.getItem('fedFinder_version');

            if (!cachedData || !cachedVersion) {
                Logger.info('No cached data found');
                return false;
            }

            // Parse the cached version
            var version = parseInt(cachedVersion, 10);

            if (isNaN(version)) {
                Logger.info('Invalid cached version');
                return false;
            }

            dataVersion = version;
            Logger.info('Found cached data with version:', dataVersion);
            return true;
        } catch (e) {
            Logger.error('Error checking cache:', e);
            return false;
        }
    }

    // Function to load data from localStorage
    function loadFromCache() {
        try {
            var cachedData = localStorage.getItem('fedFinder_data');
            var data = JSON.parse(cachedData);

            // Store the data in the global scope for search functionality
            allFederations = data.federations;
            Logger.info('Loaded', allFederations.length, 'federations from cache');
            return true;
        } catch (e) {
            Logger.error('Error loading from cache:', e);
            return false;
        }
    }

    // Function to save data to localStorage
    function saveToCache(data) {
        try {
            localStorage.setItem('fedFinder_data', JSON.stringify(data));
            localStorage.setItem('fedFinder_version', data.version || Date.now());
            Logger.info('Saved data to cache with version:', data.version || Date.now());
            return true;
        } catch (e) {
            Logger.error('Error saving to cache:', e);
            return false;
        }
    }

    // Debounce function to prevent too many searches while typing
    function debounce(func, delay) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    const debouncedSearch = debounce(function (searchTerm) {
        performSearch(searchTerm);
    }, 100); // 100ms debounce time

    // Function to show welcome message
    function showWelcomeMessage() {
        Logger.debug('Showing welcome message');
        DOMHelpers.show(".finder-message.welcome");
        DOMHelpers.hide(".finder-message.no-result");
        DOMHelpers.hide(".finder-message.loading");
        DOMHelpers.hide(".finder-results");
    }

    // Function to show no results message
    function showNoResultsMessage() {
        Logger.debug('Showing no results message');
        DOMHelpers.hide(".finder-message.welcome");
        DOMHelpers.show(".finder-message.no-result");
        DOMHelpers.hide(".finder-message.loading");
        DOMHelpers.hide(".finder-results");
    }

    // Function to show search results
    function showSearchResults() {
        Logger.debug('Showing search results');
        DOMHelpers.hide(".finder-message");
        DOMHelpers.show(".finder-results");
    }

    // Function to show loading state
    function showLoadingState() {
        Logger.debug('Showing loading state');
        DOMHelpers.hide(".finder-message.welcome");
        DOMHelpers.hide(".finder-message.no-result");
        DOMHelpers.show(".finder-message.loading");
        DOMHelpers.hide(".finder-results");
    }

    // Function to reset all map markers to default style
    function resetMapMarkers() {
        if (!window.pointSeries) {
            return;
        }

        Logger.debug('Resetting map markers');

        // Reset all markers to default style
        window.pointSeries.bulletsContainer.children.each(function (bullet) {
            if (!bullet) {
                return;
            }

            // Reset to default style
            bullet.set("radius", 4);
            bullet.set("fill", am5.color("#666666"));
            bullet.set("fillOpacity", 0.7);
        });

        // Reset map zoom to show all of North America
        if (window.chart) {
            Logger.debug('Resetting zoom to default view');
            window.chart.zoomToGeoPoint({longitude: INITIAL_VIEW.longitude, latitude: INITIAL_VIEW.latitude}, INITIAL_VIEW.zoom, true);
        }
    }

    // Set up search input handler
    DOMHelpers.find("#fedfinder-search").addEventListener("keypress", function (e) {
        if (e.which === 13) { // Enter key
            e.preventDefault();
            debouncedSearch(DOMHelpers.val("#fedfinder-search"));
        }
    });

    // Listen for changes to the search field (including when cleared with the browser's X button)
    DOMHelpers.find("#fedfinder-search").addEventListener("input", function () {
        if (DOMHelpers.val("#fedfinder-search").trim() === "") {
            // If the search field is empty, show welcome message and reset markers
            showWelcomeMessage();
            resetMapMarkers();
        } else {
            debouncedSearch(DOMHelpers.val("#fedfinder-search"));
        }
    });

    // Function to perform search and update UI
    function performSearch(searchTerm) {
        Logger.info('Performing search for:', searchTerm);

        if (!searchTerm || searchTerm.trim() === '') {
            showWelcomeMessage();
            resetMapMarkers();
            return;
        }

        // Show loading state
        showLoadingState();

        // Determine search type (zip code, state, name)
        let searchType = determineSearchType(searchTerm);

        // Check if we have the federation data loaded
        if (allFederations && allFederations.length > 0) {
            // Use cached data for all searches
            Logger.debug('Using cached data for search');

            // Filter results based on search term
            let filteredResults = filterResults(allFederations, searchTerm, searchType);

            // Track search event
            trackFedFinderEvent('fedfinder_search', {
                search_term: searchTerm,
                search_type: searchType,
                results_count: filteredResults.length
            });

            // Track no results separately for easier reporting
            if (filteredResults.length === 0) {
                trackFedFinderEvent('fedfinder_no_results', {
                    search_term: searchTerm,
                    search_type: searchType
                });
            }

            // Handle the filtered results
            handleSearchResults(filteredResults);
        } else {
            // If data isn't loaded yet, show a message
            Logger.warn('Data not loaded yet');
            showNoResultsMessage();
        }
    }

    // Function to determine search type
    function determineSearchType(searchTerm) {
        // Normalize the search term
        searchTerm = searchTerm.toLowerCase().trim();

        // Check if it's a full US zip code (5 digits)
        if (/^\d{5}$/.test(searchTerm)) {
            return 'zip';
        }

        // Check if it's a partial US zip code (1-4 digits)
        if (/^\d{1,4}$/.test(searchTerm)) {
            return 'partial_zip';
        }

        // Check if it's a Canadian postal code format (A1A 1A1)
        if (/^[A-Za-z]\d[A-Za-z][ ]?\d[A-Za-z]\d$/.test(searchTerm)) {
            return 'zip'; // Treat Canadian postal codes like zip codes
        }

        // Check if it's a partial Canadian postal code
        if (/^[A-Za-z]\d[A-Za-z]?[ ]?(\d[A-Za-z])?$/.test(searchTerm)) {
            return 'partial_zip';
        }

        // Check if it's a state code (2 letters)
        if (/^[A-Za-z]{2}$/.test(searchTerm)) {
            return 'state';
        }

        // For all other searches, use the general text search
        // This includes state names, which will be found in the haystack
        return 'text';
    }

    // Function to calculate Levenshtein distance between two strings
    function levenshteinDistance(a, b) {
        // Create matrix
        const matrix = [];

        // Initialize matrix
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        // Calculate Levenshtein distance
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                const cost = a[j - 1] === b[i - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,      // deletion
                    matrix[i][j - 1] + 1,      // insertion
                    matrix[i - 1][j - 1] + cost // substitution
                );
            }
        }

        // Return the bottom-right cell which contains the distance
        return matrix[b.length][a.length];
    }

    // Helper function to perform fuzzy search on a string
    function fuzzyMatch(text, searchTerm) {
        if (!text || typeof text !== 'string') return { match: false, distance: Infinity };

        text = text.toLowerCase();
        searchTerm = searchTerm.toLowerCase();

        // First try direct substring match (very fast)
        if (text.includes(searchTerm)) {
            return { match: true, distance: 0, matchType: 'exact' };
        }

        let bestDistance = Infinity;
        let bestMatchType = '';

        // Try whole string match
        const fullDistance = levenshteinDistance(text, searchTerm);
        if (fullDistance < bestDistance) {
            bestDistance = fullDistance;
            bestMatchType = 'full';
        }

        // Try word-by-word match
        const words = text.split(/\s+/);
        for (const word of words) {
            if (word.length > 2) {  // Only check meaningful words
                const wordDistance = levenshteinDistance(word, searchTerm);
                if (wordDistance < bestDistance) {
                    bestDistance = wordDistance;
                    bestMatchType = 'word';
                }
            }
        }

        // Calculate the maximum allowed distance based on search term length
        // 1 mistake for short terms, more for longer terms
        const maxDistance = Math.max(1, Math.floor(searchTerm.length * 0.3));

        return {
            match: bestDistance <= maxDistance,
            distance: bestDistance,
            matchType: bestMatchType
        };
    }

    // Function to filter results based on search term
    function filterResults(federations, searchTerm, searchType) {
        Logger.info('Filtering results by', searchType, 'for term:', searchTerm);

        // Normalize search term
        searchTerm = searchTerm.toLowerCase().trim();

        // Array to hold results with match type information
        var results = [];

        // Filter based on search type
        if (searchType === 'zip') {
            // For exact zip code searches, match on zip code or proximity_haystack
            federations.forEach(function (federation) {
                // Check main zip code (exact match)
                if (federation.z === searchTerm) {
                    // Clone the federation object and add match type
                    var result = Object.assign({}, federation);
                    result.matchType = 'exact';
                    results.push(result);
                    return;
                }

                // Check proximity haystack for exact zip match (service area match)
                if (federation.ph) {
                    // Use word boundary to ensure we're matching complete zip codes
                    const zipRegex = new RegExp('\\b' + searchTerm + '\\b');
                    if (zipRegex.test(federation.ph)) {
                        // Clone the federation object and add match type
                        var result = Object.assign({}, federation);
                        result.matchType = 'proximity';
                        results.push(result);
                        return;
                    }
                }
            });
        } else if (searchType === 'partial_zip') {
            // For partial zip code searches, match on zip code or proximity_haystack
            federations.forEach(function (federation) {
                // Check main zip code (exact match)
                if (federation.z && federation.z.toLowerCase().includes(searchTerm)) {
                    // Clone the federation object and add match type
                    var result = Object.assign({}, federation);
                    result.matchType = 'exact';
                    results.push(result);
                    return;
                }

                // Check proximity haystack for partial zip match (service area match)
                if (federation.ph && federation.ph.includes(searchTerm)) {
                    // Clone the federation object and add match type
                    var result = Object.assign({}, federation);
                    result.matchType = 'proximity';
                    results.push(result);
                    return;
                }
            });
        } else if (searchType === 'state') {
            // For state searches, match on state code or proximity_haystack
            const codeToMatch = searchTerm.toUpperCase();
            federations.forEach(function (federation) {
                // Check main state code (exact match)
                if (federation.sc && federation.sc.toUpperCase() === codeToMatch) {
                    // Clone the federation object and add match type
                    var result = Object.assign({}, federation);
                    result.matchType = 'exact';
                    results.push(result);
                    return;
                }

                // Check proximity haystack for state code match (service area match)
                if (federation.ph) {
                    // Use word boundary to ensure we're matching complete state codes
                    const stateRegex = new RegExp('\\b' + searchTerm + '\\b', 'i');
                    if (stateRegex.test(federation.ph)) {
                        // Clone the federation object and add match type
                        var result = Object.assign({}, federation);
                        result.matchType = 'proximity';
                        results.push(result);
                        return;
                    }
                }
            });
        } else {
            // For general text searches, first check for exact matches
            federations.forEach(function (federation) {
                // Check main search haystack (exact match)
                if (federation.sh && federation.sh.includes(searchTerm)) {
                    // Clone the federation object and add match type
                    var result = Object.assign({}, federation);
                    result.matchType = 'exact';
                    results.push(result);
                    return;
                }

                // Check proximity haystack (service area match)
                if (federation.ph && federation.ph.includes(searchTerm)) {
                    // Clone the federation object and add match type
                    var result = Object.assign({}, federation);
                    result.matchType = 'proximity';
                    results.push(result);
                    return;
                }

                // Fallback to individual field search if haystacks aren't available
                const fieldsToSearch = [
                    federation.n,
                    federation.a,
                    federation.c,
                    federation.sc,
                    federation.z,
                    federation.co,
                    federation.e,
                    federation.p,
                    federation.w
                ];

                // Check if any field contains the search term
                if (fieldsToSearch.some(function (field) {
                    return field && field.toString().toLowerCase().includes(searchTerm);
                })) {
                    // Clone the federation object and add match type
                    var result = Object.assign({}, federation);
                    result.matchType = 'exact';
                    results.push(result);
                }
            });

            // If no exact matches and the search term is substantial (3+ characters), do fuzzy searching
            if (results.length === 0 && searchTerm.length >= 3) {
                // Skip fuzzy search for purely numeric terms (like zip codes)
                const isNumeric = /^\d+$/.test(searchTerm);

                if (isNumeric) {
                    Logger.info('Skipping fuzzy search for numeric search term:', searchTerm);
                    return results; // Return empty results for numeric terms
                }

                Logger.info('No exact matches found, performing fuzzy search');

                // Array to hold fuzzy match results with their Levenshtein distances
                var fuzzyResults = [];

                federations.forEach(function(federation) {
                    // Check the name field first (most important for fuzzy matching)
                    if (federation.n) {
                        const nameResult = fuzzyMatch(federation.n, searchTerm);
                        if (nameResult.match) {
                            const result = Object.assign({}, federation);
                            result.matchType = 'fuzzy';
                            result.levenshteinDistance = nameResult.distance;
                            result.fuzzyMatchType = 'name_' + nameResult.matchType;
                            fuzzyResults.push(result);
                            return;
                        }
                    }

                    // Check search haystack (contains all searchable fields)
                    if (federation.sh) {
                        const shResult = fuzzyMatch(federation.sh, searchTerm);
                        if (shResult.match) {
                            const result = Object.assign({}, federation);
                            result.matchType = 'fuzzy';
                            result.levenshteinDistance = shResult.distance;
                            result.fuzzyMatchType = 'haystack_' + shResult.matchType;
                            fuzzyResults.push(result);
                            return;
                        }
                    }

                    // Check proximity haystack as a last resort
                    if (federation.ph) {
                        const phResult = fuzzyMatch(federation.ph, searchTerm);
                        if (phResult.match) {
                            const result = Object.assign({}, federation);
                            result.matchType = 'fuzzy';
                            result.levenshteinDistance = phResult.distance;
                            result.fuzzyMatchType = 'proximity_' + phResult.matchType;
                            fuzzyResults.push(result);
                        }
                    }
                });

                Logger.info(`Fuzzy search found ${fuzzyResults.length} results`);

                // Sort fuzzy matches by Levenshtein distance (smaller distances = better matches)
                fuzzyResults.sort(function(a, b) {
                    return a.levenshteinDistance - b.levenshteinDistance;
                });

                // Add fuzzy results to our final results array
                results = fuzzyResults;
            }
        }

        return results;
    }

    // Function to handle search results
    function handleSearchResults(results) {
        Logger.info('Handling search results, count:', results ? results.length : 0);

        // Add click handlers to results
        document.querySelectorAll('.finder-results .result').forEach(function(el, index) {
            el.addEventListener('click', function() {
                trackFedFinderEvent('fedfinder_result_click', {
                    federation_name: el.dataset.federationName,
                    federation_id: el.dataset.organizationId,
                    result_position: index + 1
                });
            });
        });

        // Always hide the loading spinner when handling results
        DOMHelpers.hide(".finder-message.loading");

        if (!results || results.length === 0) {
            showNoResultsMessage();
            return;
        }

        // Separate matches by type
        var exactMatches = results.filter(function (org) {
            return org.matchType === 'exact';
        });

        var proximityMatches = results.filter(function (org) {
            return org.matchType === 'proximity';
        });

        var fuzzyMatches = results.filter(function (org) {
            return org.matchType === 'fuzzy';
        });

        // Prioritize results with state_code
        var resultsWithStateCode = exactMatches.filter(function (org) {
            return org.sc && org.sc.trim() !== '';
        });

        var resultsWithoutStateCode = exactMatches.filter(function (org) {
            return !org.sc || org.sc.trim() === '';
        });

        // Determine which results to display
        var displayResults;

        if (resultsWithStateCode.length > 0) {
            // If we have results with state codes, only show those
            displayResults = resultsWithStateCode;
        } else if (exactMatches.length > 0) {
            // If we have exact matches but none with state codes, show all exact matches
            displayResults = exactMatches;
        } else if (proximityMatches.length > 0) {
            // If no exact matches, show proximity matches
            displayResults = proximityMatches;
        } else {
            // If no exact or proximity matches, show fuzzy matches
            displayResults = fuzzyMatches;
        }

        // Clear existing results
        DOMHelpers.empty(".finder-results");

        // Add a note if showing proximity matches
        //if (exactMatches.length === 0 && proximityMatches.length > 0) {
            //DOMHelpers.find(".finder-results").innerHTML += '<div class="proximity-note">No exact matches found. Showing nearby organizations.</div>';
        //}

        // Add a note if showing fuzzy matches
        if (exactMatches.length === 0 && proximityMatches.length === 0 && fuzzyMatches.length > 0) {
            DOMHelpers.find(".finder-results").innerHTML += '<div class="proximity-note">No exact matches found. Showing results with similar spelling or related content.</div>';
        }

        // Add each result to the list
        displayResults.forEach(function (org) {
            // Format address parts
            var addressLine1 = org.a || '';
            var addressLine2 = '';

            if (org.c || org.sc || org.z) {
                addressLine2 = [
                    org.c || '',
                    org.sc || '',
                    org.z || ''
                ].filter(Boolean).join(', ');
            }

            var resultHtml = `
            <li class="result" data-federation-name="${org.n || ''}" data-organization-id="${org.id || ''}">
                <h5>${org.n || 'Unknown Organization'}</h5>
                ${addressLine1 ? `<p>${addressLine1}</p>` : ''}
                ${addressLine2 ? `<p>${addressLine2}</p>` : ''}
                ${org.co ? `<p>${org.co}</p>` : ''}
                <div class="fed-card">
                    ${org.p ? `<ul><li><p>Phone:</p></li><li><p>${org.p}</p></li></ul>` : ''}
                    ${org.e ? `<ul><li><p>Email:</p></li><li><p><a href="mailto:${org.e}">${org.e}</a></p></li></ul>` : ''}
                    ${org.w ? `<ul><li><p>Website:</p></li><li><a class="button blue" href="${org.w}" target="_blank" onclick="trackFedFinderEvent('fedfinder_learn_more', {federation_name: '${(org.n || '').replace(/'/g, "\\'")}', federation_id: '${org.id}', destination_url: '${org.w}'})">Learn More <img src="https://cdn.fedweb.org/fed-42/2/icon.svg"></a></li></ul>` : ''}
                    ${org.d ? `<ul><li><p>Donate:</p></li><li><a class="button blue" href="${org.d}" target="_blank" onclick="trackFedFinderEvent('fedfinder_donate', {federation_name: '${(org.n || '').replace(/'/g, "\\'")}', federation_id: '${org.id}', destination_url: '${org.d}'})">Donate Now <img src="https://cdn.fedweb.org/fed-42/2/icon.svg"></a></li></ul>` : ''}
                </div>
            </li>
        `;
            DOMHelpers.find(".finder-results").innerHTML += resultHtml;
        });

        // Show results
        showSearchResults();

        // Highlight matching map markers
        highlightMapMarkers(displayResults);

        // Collect coordinates directly from search results for zooming
        var searchResultCoordinates = [];
        displayResults.forEach(function (org) {
            if (org.lat && org.lng) {
                searchResultCoordinates.push({
                    longitude: parseFloat(org.lng),
                    latitude: parseFloat(org.lat)
                });
            } else if (org.ms) {
                // If we just have map state but no coordinates, don't add to zoom coordinates
            }
        });

        // Zoom to search result coordinates if we have any
        if (searchResultCoordinates.length > 0) {
            zoomToCoordinates(searchResultCoordinates);
        }
    }

    // Function to highlight map markers that match search results
    function highlightMapMarkers(results) {
        if (!window.pointSeries || !results || results.length === 0) {
            return;
        }

        // Get organization IDs from results
        var organizationIds = results.map(function (org) {
            return org.id;
        });

        Logger.debug("Searching for organization IDs:", organizationIds);

        // Track coordinates for zooming
        var matchingCoordinates = [];

        // Loop through all data items to find matches
        window.pointSeries.bulletsContainer.children.each(function (bullet) {
            if (!bullet) {
                return;
            }

            // Reset to default style
            bullet.set("radius", 4);
            bullet.set("fill", am5.color("#F9F9F9"));
            bullet.set("fillOpacity", 0.7);

            // Get the data context from the bullet's data item
            var dataItem = bullet.dataItem;
            if (!dataItem || !dataItem.dataContext) {
                return;
            }

            var dataContext = dataItem.dataContext;

            // Check if this marker matches any result
            if (organizationIds.includes(dataContext.id)) {
                Logger.debug("Found matching marker:", dataContext.name);

                // Highlight this marker
                bullet.set("radius", 6);
                bullet.set("fill", am5.color("#1E3EAF"));
                bullet.set("fillOpacity", 1);

                // Add coordinates for zooming
                if (dataContext.geometry && dataContext.geometry.coordinates) {
                    matchingCoordinates.push({
                        longitude: dataContext.geometry.coordinates[0],
                        latitude: dataContext.geometry.coordinates[1]
                    });
                }
            }
        });

        // Zoom to show all matching markers if we have any
        if (matchingCoordinates.length > 0) {
            zoomToCoordinates(matchingCoordinates);
        }
    }

    // Function to zoom map to show a set of coordinates
    function zoomToCoordinates(coordinates) {
        if (!window.chart || coordinates.length === 0) {
            return;
        }

        // If only one point, zoom to it
        if (coordinates.length === 1) {
            window.chart.zoomToGeoPoint(coordinates[0], 4, true);
            return;
        }

        // Find the bounding box of all coordinates
        var minLong = Infinity;
        var maxLong = -Infinity;
        var minLat = Infinity;
        var maxLat = -Infinity;

        coordinates.forEach(function (coord) {
            minLong = Math.min(minLong, coord.longitude);
            maxLong = Math.max(maxLong, coord.longitude);
            minLat = Math.min(minLat, coord.latitude);
            maxLat = Math.max(maxLat, coord.latitude);
        });

        // Add some padding
        var padding = 1;
        minLong -= padding;
        maxLong += padding;
        minLat -= padding;
        maxLat += padding;

        // Calculate center point
        var centerLong = (minLong + maxLong) / 2;
        var centerLat = (minLat + maxLat) / 2;

        // Calculate appropriate zoom level
        var zoomLevel = 2;
        var longDiff = Math.abs(maxLong - minLong);
        var latDiff = Math.abs(maxLat - minLat);

        if (longDiff < 10 && latDiff < 10) {
            zoomLevel = 3;
        }
        if (longDiff < 5 && latDiff < 5) {
            zoomLevel = 4;
        }
        if (longDiff < 2 && latDiff < 2) {
            zoomLevel = 5;
        }

        // Zoom to the center point with calculated zoom level
        window.chart.zoomToGeoPoint({longitude: centerLong, latitude: centerLat}, zoomLevel, true);
    }


    let selectedPolygon = null; // Global tracker


    // Function to handle polygon clicks (for both US states and Canadian provinces)
    function handlePolygonClick(dataItem, countryPrefix) {
        Logger.info("Clicked on polygon:", dataItem);
        var regionId = dataItem.get("id"); // Format: "US-XX" or "CA-XX"
        var regionName = dataItem.dataContext.name; // Access the name from dataContext

        // Extract region code (remove country prefix)
        var regionCode = regionId.substring(countryPrefix.length);

        Logger.info("Clicked on region: " + regionName + " (" + regionId + ")");

        // Track map state click
        trackFedFinderEvent('fedfinder_map_state_click', {
            state_code: regionCode,
            // If prefix is US- then country is US, if CA- then Canada
            country: countryPrefix === 'US-' ? 'US' : 'CA'
        });

        // Update the search field with the region name
        Logger.debug('updating search box with region name ' + regionName);
        DOMHelpers.val("#fedfinder-search", regionName);

        // Show loading state before performing search
        showLoadingState();

        // Perform search using the federation name
        performSearch(regionCode);
    }

    am5.ready(function () {

        // =================================
        // Create map chart
        // =================================

        // Create root and chart
        var root = am5.Root.new("chartdiv");

        // Set themes
        root.setThemes([
            am5themes_Animated.new(root)
        ]);

        var chart = root.container.children.push(
            am5map.MapChart.new(root, {
                panX: "rotateX",
                wheelY: "none",
                minZoomLevel: 1.5,
                maxZoomLevel: 16,
                projection: am5map.geoMercator(),
                background: am5.Rectangle.new(root, {
                    fill: am5.color(0xD2E9FF),
                    fillOpacity: 1
                }),
                homeZoomLevel: INITIAL_VIEW.zoom,
                homeGeoPoint: { longitude: INITIAL_VIEW.longitude, latitude: INITIAL_VIEW.latitude }
            })
        );

        // allow mouse wheel to zoom when CTRL is held
        chart.events.on("wheel", function (ev) {
            if (ev.originalEvent.ctrlKey) {

                // Let the default wheel behavior happen (which will zoom)
                ev.originalEvent.preventDefault();
                chart.set("wheelY", "zoom");

                // Use setTimeout to log the zoom level after it has been updated
                setTimeout(function () {
                    // Reset wheelY to none after zooming
                    chart.set("wheelY", "none");
                }, 100);
            }
        });

        // Create polygon series
        // US States
        var usaSeries = chart.series.push(
            am5map.MapPolygonSeries.new(root, {
                geoJSON: am5geodata_usaLow,
            })
        );

        usaSeries.mapPolygons.template.setAll({
            tooltipText: "{name}",
            fill: am5.color(0xF9F9F9),
            stroke: am5.color(0x27277C),
            interactive: true  // Make sure polygons are interactive
        });

        usaSeries.mapPolygons.template.states.create("default", {
            fill: am5.color(0xF9F9F9),
            stroke: am5.color(0x27277C),
        });

        usaSeries.mapPolygons.template.states.create("hover", {
            fill: am5.color(0x1C88ED),
            stroke: am5.color(0x27277C),
        });

        // usaSeries.mapPolygons.template.states.create("active", {
        //     fill: am5.color(0x1C88ED),
        //     stroke: am5.color(0x27277C),
        // });

        // Add click event to US states
        usaSeries.mapPolygons.template.events.on("click", function (ev) {
            handlePolygonClick(ev.target.dataItem, "US-");

            // === Highlight clicked polygon ===
            const polygon = ev.target.dataItem.get("mapPolygon"); // this gets the actual polygon sprite
            // Set custom properties on the clicked polygon
            polygon.set("fill", am5.color(0x1C88ED));      // Fill color
            //polygon.set("stroke", am5.color(0x27277C));    // Border color
            //polygon.set("strokeWidth", 2);                 // Border width
            polygon.set("tooltipText", "You clicked: " + dataItem.dataContext.name);
            
            if (!polygon) return;

            // Reset previously selected polygon
            if (selectedPolygon && selectedPolygon !== polygon) {
                selectedPolygon.states.apply("default");
                console.log('default reset');
            }

            // Apply active state to clicked polygon
            // polygon.states.apply("active");
            selectedPolygon = polygon;
                
        });

        // Canada Provinces
        var canadaSeries = chart.series.push(
            am5map.MapPolygonSeries.new(root, {
                geoJSON: am5geodata_canadaLow,
            })
        );

        canadaSeries.mapPolygons.template.setAll({
            tooltipText: "{name}",
            fill: am5.color(0xF9F9F9),
            stroke: am5.color(0x27277C),
            interactive: true  // Make sure polygons are interactive
        });

        canadaSeries.mapPolygons.template.states.create("hover", {
            fill: am5.color(0x1C88ED),
            stroke: am5.color(0x27277C),
        });


        // Add click event to Canadian provinces
        canadaSeries.mapPolygons.template.events.on("click", function (ev) {
            handlePolygonClick(ev.target.dataItem, "CA-");
        });

        usaSeries.events.on("datavalidated", function() {
            Logger.info('Going home!');
            chart.goHome();
        });


        // Disable the default zoom control
        chart.set("zoomControl", false);

        // Create a custom zoom control container
        var zoomControl = root.container.children.push(
            am5.Container.new(root, {
                x: am5.p100,
                y: am5.p100,
                dx: -50,
                dy: -100,
                width: 32,
                height: 64,
                layout: root.verticalLayout
            })
        );

        // Create plus button (top half of the pill)
        var plusButton = zoomControl.children.push(
            am5.Button.new(root, {
                width: 32,
                height: 32,
                cursorOverStyle: "pointer",
                background: am5.RoundedRectangle.new(root, {
                    fill: am5.color("#193a9f"),
                    cornerRadiusTL: 16,
                    cornerRadiusTR: 16,
                    cornerRadiusBL: 0,
                    cornerRadiusBR: 0
                })
            })
        );

        // Add plus sign
        plusButton.children.push(
            am5.Graphics.new(root, {
                dx: -30,
                dy: -2,
                stroke: am5.color("#ffffff"),
                strokeWidth: 2,
                strokeOpacity: 0.7,
                svgPath: "M12,6 L12,18 M6,12 L18,12" // Centered plus sign
            })
        );

        // Create hover state for plus button
        plusButton.get("background").states.create("hover", {}).setAll({
            fill: am5.color(0xa7c0e9)
        });

        // Create a separator line
        zoomControl.children.push(
            am5.Graphics.new(root, {
                stroke: am5.color("#ffffff"),
                strokeWidth: 1,
                strokeOpacity: 0.5,
                svgPath: "M0,0 L32,0"
            })
        );

        // Create minus button (bottom half of the pill)
        var minusButton = zoomControl.children.push(
            am5.Button.new(root, {
                width: 32,
                height: 32,
                cursorOverStyle: "pointer",
                background: am5.RoundedRectangle.new(root, {
                    fill: am5.color("#193a9f"),
                    cornerRadiusTL: 0,
                    cornerRadiusTR: 0,
                    cornerRadiusBL: 16,
                    cornerRadiusBR: 16
                })
            })
        );

        // Add minus sign
        minusButton.children.push(
            am5.Graphics.new(root, {
                dy: -6,
                stroke: am5.color("#ffffff"),
                strokeWidth: 2,
                svgPath: "M6,12 L18,12" // Centered minus sign
            })
        );

        // Create hover state for minus button
        minusButton.get("background").states.create("hover", {}).setAll({
            fill: am5.color(0xa7c0e9)
        });

        // Create down state for minus button
        minusButton.get("background").states.create("down", {}).setAll({
            fill: am5.color(0xa7c0e9)
        });

        // Add zoom in functionality
        plusButton.events.on("click", function () {
            chart.zoomIn();
        });

        // Add zoom out functionality
        minusButton.events.on("click", function () {
            chart.zoomOut();
        });

        // =================================
        // Set up point series
        // =================================

        // Constants for map data cache
        const MAP_DATA_CACHE_KEY = 'fedFinder_mapData';
        const MAP_DATA_VERSION_KEY = 'fedFinder_mapData_version';

        // Check if we have valid cached map data
        function hasValidMapCache() {
            try {
                var cachedData = localStorage.getItem(MAP_DATA_CACHE_KEY);
                if (!cachedData) {
                    return false;
                }
                return true;
            } catch (e) {
                Logger.error('Error checking map data cache:', e);
                return false;
            }
        }

        // Save map data to cache with version
        function saveMapDataToCache(data, version) {
            try {
                localStorage.setItem(MAP_DATA_CACHE_KEY, JSON.stringify(data));
                localStorage.setItem(MAP_DATA_VERSION_KEY, version);
                Logger.info('Map data saved to cache with version:', version);
                return true;
            } catch (e) {
                Logger.error('Error saving map data to cache:', e);
                return false;
            }
        }

        // Load map data from cache
        function loadMapDataFromCache() {
            try {
                var cachedData = localStorage.getItem(MAP_DATA_CACHE_KEY);
                if (!cachedData) {
                    return false;
                }

                var mapMarkers = JSON.parse(cachedData);
                Logger.info('Loaded map data from cache');
                // Set up map markers with cached data
                setupMapMarkers(mapMarkers);
                return true;
            } catch (e) {
                Logger.error('Error loading map data from cache:', e);
                return false;
            }
        }

        // Get current cached version
        function getMapDataVersion() {
            try {
                return localStorage.getItem(MAP_DATA_VERSION_KEY) || '';
            } catch (e) {
                return '';
            }
        }

        // Fetch map marker data from the API
        function fetchMapData() {
            // First check if we have valid cached data
            if (hasValidMapCache() && loadMapDataFromCache()) {
                Logger.info('Using cached map data');

                // After a short delay, fetch fresh data in the background
                setTimeout(function () {
                    Logger.info('Checking for updated map data in the background');

                    fetch('/api/federation-finder/map-data')
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Network response was not ok');
                            }
                            return response.json();
                        })
                        .then(data => {
                            // Compare version to see if we have newer data
                            var oldVersion = getMapDataVersion();
                            var newVersion = data.version || Date.now().toString();

                            if (newVersion !== oldVersion) {
                                Logger.info('Updating to newer map data: version ' + newVersion);
                                // Update the map markers
                                setupMapMarkers(data.query_results || []);
                                // Save to cache with new version
                                saveMapDataToCache(data.query_results || [], newVersion);
                            } else {
                                Logger.info('Background refresh complete - map data already current');
                            }
                        })
                        .catch(error => {
                            Logger.error('Background refresh of map data failed:', error);
                        });
                }, 1000); // Wait 1 second before refreshing
            } else {
                // No valid cache, fetch from server
                Logger.info('No cached map data available, fetching from server');

                // Show loading state while fetching
                showLoadingState();

                fetch('/api/federation-finder/map-data')
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    })
                    .then(data => {
                        Logger.info('Map data loaded successfully from server');
                        var version = data.version || Date.now().toString();
                        // Save to cache for future use with version
                        saveMapDataToCache(data.query_results || [], version);
                        // Set up map markers with the received data
                        setupMapMarkers(data.query_results || []);
                        // Hide loading state after data is loaded
                        DOMHelpers.hide(".finder-message.loading");
                        showWelcomeMessage();
                    })
                    .catch(error => {
                        Logger.error('Error fetching map data:', error);
                        // Hide loading state on error
                        DOMHelpers.hide(".finder-message.loading");
                        showWelcomeMessage();
                    });
            }
        }

        // Fetch map data with caching
        fetchMapData();

        // Function to set up map markers with the data
        function setupMapMarkers(markers) {
            Logger.info('Setting up map with map marker data');

            // Create point series
            var pointSeries = chart.series.push(
                am5map.MapPointSeries.new(root, {
                    calculateAggregates: true
                })
            );

            // Store point series in global scope for access by search functions
            window.pointSeries = pointSeries;

            // Store chart in global scope for access by search functions
            window.chart = chart;

            //Add federation bullet
            pointSeries.bullets.push(function () {
                var circle = am5.Circle.new(root, {
                    radius: 4,
                    fill: am5.color("#1E3EAF"),
                    fillOpacity: 0.7,
                    stroke: am5.color("#ffffff"),
                    strokeWidth: 1,
                    strokeOpacity: 0.7,
                    cursorOverStyle: "pointer",
                    tooltipText: "{name}"
                });

                // Set up click event for the circle
                circle.events.on("click", function (ev) {
                    var data = ev.target.dataItem.dataContext;

                    // Update the search field with the federation name
                    DOMHelpers.val("#fedfinder-search", data.name);

                    // Show loading state before performing search
                    showLoadingState();

                    // Perform search using the federation name
                    performSearch(data.name);

                    // Track marker click
                    trackFedFinderEvent('fedfinder_map_marker_click', {
                        federation_name: data.name,
                        federation_id: data.id
                    });
                });

                return am5.Bullet.new(root, {
                    sprite: circle
                });
            });

            //Process data and create individual points
            var mapDataPoints = [];

            am5.array.each(markers, function (marker) {
                // Add individual federation point
                mapDataPoints.push({
                    name: marker.n || "Federation",
                    state: marker.st,
                    id: marker.id,
                    geometry: {
                        type: "Point",
                        coordinates: [
                            am5.type.toNumber(marker.lng),
                            am5.type.toNumber(marker.lat)
                        ]
                    }
                });
            });

            //Add data to the series
            pointSeries.data.setAll(mapDataPoints);
        }

        // Load federation data for search functionality
        // First check if we have valid cached data
        if (hasValidCache() && loadFromCache()) {
            Logger.info('Using cached federation data for search functionality');

            // We have data from cache, make sure loading state is hidden
            DOMHelpers.hide(".finder-message.loading");
            showWelcomeMessage();

            // After a short delay, fetch fresh data in the background to update cache
            setTimeout(function () {
                Logger.info('Refreshing federation data in the background');

                fetch('/api/federation-finder/all-data')
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    })
                    .then(data => {
                        // Compare version to see if we have newer data
                        var oldVersion = dataVersion;
                        var newVersion = data.version || Date.now();

                        if (newVersion !== oldVersion) {
                            Logger.info('Updating to newer federation data: version ' + newVersion);
                            // Update the global data
                            allFederations = data.federations;
                            // Save to cache
                            saveToCache(data);
                        } else {
                            Logger.info('Background refresh complete - data already current');
                        }
                    })
                    .catch(error => {
                        Logger.error('Background refresh of federation data failed:', error);
                    });
            }, 1000); // Wait 1 second before refreshing
        } else {
            // No valid cache, fetch from server
            Logger.info('No cached data available, fetching federation data from server');

            fetch('/api/federation-finder/all-data')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    Logger.info('Loaded', data.federations.length, 'federations from server');
                    // Store the data globally for search functionality
                    allFederations = data.federations;
                    // Save to cache for future use
                    saveToCache(data);

                    // Hide loading spinner after data is loaded
                    DOMHelpers.hide(".finder-message.loading");
                    // Show welcome message since we just loaded data
                    showWelcomeMessage();
                })
                .catch(error => {
                    Logger.error('Error loading federation data for search:', error);
                    // Hide loading spinner on error too
                    DOMHelpers.hide(".finder-message.loading");
                    // Show welcome message as fallback
                    showWelcomeMessage();
                });
        }

        // Process each federation that has map data in the full data set
        function processFullFederationData(data) {
            Logger.debug('Processing full federation data for search');

            // Store the data in the global scope for search functionality
            allFederations = data.federations;

            Logger.info('Full federation data loaded for search with', allFederations.length, 'federations');
        }
    }); // end am5.ready()
});