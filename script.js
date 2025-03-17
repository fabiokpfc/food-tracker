document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  loginBtn.addEventListener("click", async () => {
    const password = document.getElementById("loginPassword").value;
    if (password === "marcom") {
      document.getElementById("loginModal").style.display = "none";
      await initializeApp();
    } else {
      document.getElementById("loginError").style.display = "block";
    }
  });

  // Add event listener for "Enter" key press in password input
  const passwordInput = document.getElementById("loginPassword");
  passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      loginBtn.click(); // Trigger the login button click event
    }
  });
});

async function initializeApp() {
  const room = new WebsimSocket();

  // Get the creator's username to determine admin status
  const creatorUsername = (await window.websim.getCreatedBy()).username;

  // Helper function to check if current user is admin
  function isAdmin() {
    return room.party.client.username === creatorUsername;
  }

  // References to DOM elements.
  const form = document.getElementById("lunchForm");
  const lunchList = document.getElementById("lunchList");
  const randomizeBtn = document.getElementById("randomizeBtn");
  const resetRandomizerBtn = document.getElementById("resetRandomizerBtn");
  const randomizerResult = document.getElementById("randomizerResult");
  const cuisineTagsContainer = document.getElementById("cuisineTags");
  const cuisineInput = document.getElementById("cuisine");

  // New modal elements
  const randomizedModal = document.getElementById('randomizedModal');
  const modalRestaurantName = document.getElementById('modalRestaurantName');
  const modalRestaurantCuisine = document.getElementById('modalRestaurantCuisine');
  const modalRestaurantLink = document.getElementById('modalRestaurantLink');
  const closeModalButton = document.querySelector('.close-button');

  // Pagination state
  let currentPage = 1;
  const entriesPerPage = 5;

  // Global storage for persistent records.
  let currentLunchRecords = [];

  // Global storage for cuisine tags
  let selectedCuisineTags = [];

  // Helper to compute the current week identifier based on Monday GMT+8.
  function getCurrentWeekId() {
    const now = new Date();
    const gmt8Now = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Singapore" })
    );
    const day = gmt8Now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(gmt8Now);
    monday.setDate(gmt8Now.getDate() - diff);
    const yyyy = monday.getFullYear();
    const mm = String(monday.getMonth() + 1).padStart(2, "0");
    const dd = String(monday.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // Initialize week-specific storage for the randomizer.
  const currentWeekId = getCurrentWeekId();
  if (localStorage.getItem("randomizerWeek") !== currentWeekId) {
    localStorage.setItem("randomizerWeek", currentWeekId);
    localStorage.setItem("randomizerPicked", JSON.stringify([]));
  }

  // Helper function to get unique cuisines from records
  function getUniqueCuisines() {
    const cuisineSet = new Set();
    currentLunchRecords.forEach(record => {
      const cuisines = record.cuisine.split(',').map(c => c.trim().toLowerCase());
      cuisines.forEach(cuisine => {
        if (cuisine) {
          // Capitalize first letter of each word for display
          const formattedCuisine = cuisine.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          cuisineSet.add(formattedCuisine);
        }
      });
    });
    return Array.from(cuisineSet).sort();
  }

  // Function to update cuisine tags display
  function updateCuisineTags() {
    cuisineTagsContainer.innerHTML = '';
    const uniqueCuisines = getUniqueCuisines();

    uniqueCuisines.forEach(cuisine => {
      const tag = document.createElement('button');
      tag.className = 'cuisine-tag';
      if (selectedCuisineTags.map(t => t.toLowerCase()).includes(cuisine.toLowerCase())) {
        tag.classList.add('selected');
      }
      tag.textContent = cuisine;

      tag.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent form submission on tag click
        const lowerCuisine = cuisine.toLowerCase();
        const lowerSelectedTags = selectedCuisineTags.map(t => t.toLowerCase());

        if (lowerSelectedTags.includes(lowerCuisine)) {
          // Remove tag if already selected
          selectedCuisineTags = selectedCuisineTags.filter(t => t.toLowerCase() !== lowerCuisine);
          tag.classList.remove('selected');
        } else if (selectedCuisineTags.length < 2) {
          // Add tag if less than 2 are selected
          selectedCuisineTags.push(cuisine);
          tag.classList.add('selected');
        }

        // Update input field with selected tags
        cuisineInput.value = selectedCuisineTags.join(', ');
      });

      cuisineTagsContainer.appendChild(tag);
    });
  }

  // Clear selected tags when form is reset
  form.addEventListener('reset', () => {
    selectedCuisineTags = [];
    updateCuisineTags();
  });

  // Handle Tab key press and input changes
  cuisineInput.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();

      const currentValue = cuisineInput.value.trim();
      const cuisines = currentValue.split(',')
        .map(c => {
          const trimmed = c.trim();
          // Capitalize first letter of each word
          return trimmed.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        })
        .filter(c => c);

      // Remove duplicates (case-insensitive)
      const uniqueCuisines = [...new Set(cuisines.map(c => c.toLowerCase()))]
        .map(c => cuisines.find(cuisine => cuisine.toLowerCase() === c));

      // Only proceed if we have a new cuisine and less than 2 total
      if (uniqueCuisines.length > 0 && uniqueCuisines.length <= 2) {
        // Update selected tags
        selectedCuisineTags = uniqueCuisines;
        updateCuisineTags();

        // If we have one cuisine, add a comma and space for the next one
        if (uniqueCuisines.length === 1) {
          cuisineInput.value = uniqueCuisines[0] + ', ';
        } else {
          cuisineInput.value = uniqueCuisines.join(', ');
        }
      }
    }
  });

  // Update cuisine input when typing
  cuisineInput.addEventListener('input', () => {
    const currentValue = cuisineInput.value;
    const cuisines = currentValue.split(',')
      .map(c => {
        const trimmed = c.trim();
        // Capitalize first letter of each word
        return trimmed.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      })
      .filter(c => c);

    // Remove duplicates (case-insensitive) and limit to 2 cuisines
    const uniqueCuisines = [...new Set(cuisines.map(c => c.toLowerCase()))]
      .map(c => cuisines.find(cuisine => cuisine.toLowerCase() === c))
      .slice(0, 2);

    selectedCuisineTags = uniqueCuisines;
    updateCuisineTags();
  });

  // Add this new function to update cuisine filter options
  function updateCuisineFilterOptions() {
    const cuisineFilter = document.getElementById("cuisineFilter");
    const selectedValue = cuisineFilter.value;

    // Get unique cuisines (case-insensitive)
    const uniqueCuisines = new Set();
    currentLunchRecords.forEach(record => {
      record.cuisine.split(',').map(c => {
        const trimmed = c.trim();
        if (trimmed) {
          // Capitalize first letter of each word
          const formattedCuisine = trimmed.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          uniqueCuisines.add(formattedCuisine);
        }
      });
    });

    // Clear existing options except the "All Cuisines" option
    cuisineFilter.innerHTML = '<option value="">All Cuisines</option>';

    // Add cuisine options
    Array.from(uniqueCuisines).sort().forEach(cuisine => {
      const option = document.createElement('option');
      option.value = cuisine;
      option.textContent = cuisine;
      if (cuisine.toLowerCase() === selectedValue.toLowerCase()) {
        option.selected = true;
      }
      cuisineFilter.appendChild(option);
    });

    // Add change event listener if it hasn't been added yet
    if (!cuisineFilter.hasAttribute('data-listener-attached')) {
      cuisineFilter.addEventListener('change', () => {
        currentPage = 1; // Reset to first page when filter changes
        updateLunchList();
      });
      cuisineFilter.setAttribute('data-listener-attached', 'true');
    }
  }

  // Function to update lunch list.
  function updateLunchList() {
    // Get the selected cuisine filter
    const cuisineFilter = document.getElementById("cuisineFilter").value.toLowerCase();

    // Filter records based on selected cuisine
    let filteredRecords = currentLunchRecords;
    if (cuisineFilter) {
      filteredRecords = currentLunchRecords.filter(record => {
        const cuisines = record.cuisine.split(',').map(c => c.trim().toLowerCase());
        return cuisines.includes(cuisineFilter);
      });
    }

    // Update cuisine filter options
    updateCuisineFilterOptions();

    lunchList.innerHTML = "";

    // Calculate pagination
    const totalPages = Math.ceil(filteredRecords.length / entriesPerPage);
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = startIndex + entriesPerPage;
    const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

    if (paginatedRecords.length === 0) {
      const emptyMessage = document.createElement("li");
      emptyMessage.classList.add("lunch-entry");
      emptyMessage.textContent = cuisineFilter
        ? `No restaurants found for ${document.getElementById("cuisineFilter").value} cuisine.`
        : "No restaurants available.";
      lunchList.appendChild(emptyMessage);
    } else {
      paginatedRecords.forEach((record) => {
        const li = document.createElement("li");
        li.classList.add("lunch-entry");

        // Create main content div
        const contentDiv = document.createElement("div");
        contentDiv.style.display = "flex";
        contentDiv.style.justifyContent = "space-between";
        contentDiv.style.alignItems = "center";

        // Left side with restaurant info
        const infoDiv = document.createElement("div");
        
        // Create price display with tooltip
        const priceDisplay = record.priceRange ? 
          `<span class="price-range" title="${getPriceTooltip(record.priceRange)}">${'$'.repeat(record.priceRange)}</span>` : '';
        
        infoDiv.innerHTML = `
          <a href="${record.mapsLink}" target="_blank" rel="noopener noreferrer"><strong>${record.restaurant}</strong></a> 
          ${priceDisplay}
          &mdash; ${record.cuisine}
          <br><small>${new Date(record.created_at).toLocaleString()}</small>
        `;

        // Right side with delete button for admin/owner
        if (isAdmin() || record.username === room.party.client.username) {
          const deleteBtn = document.createElement("button");
          deleteBtn.textContent = "Delete";
          deleteBtn.classList.add("delete-btn");
          deleteBtn.addEventListener("click", async () => {
            if (confirm(`Are you sure you want to delete the entry for "${record.restaurant}"?`)) {
              try {
                await room.collection("lunch").delete(record.id);
              } catch (error) {
                console.error("Failed to delete lunch entry:", error);
                alert("Failed to delete the entry. Please try again.");
              }
            }
          });
          contentDiv.appendChild(infoDiv);
          contentDiv.appendChild(deleteBtn);
        } else {
          contentDiv.appendChild(infoDiv);
        }

        li.appendChild(contentDiv);
        lunchList.appendChild(li);
      });
    }

    // Update pagination controls
    updatePaginationControls(totalPages);
  }

  // Helper function to get price tooltip text
  function getPriceTooltip(priceRange) {
    const priceDescriptions = {
      1: "Inexpensive",
      2: "Moderate",
      3: "Expensive",
      4: "Very Expensive"
    };
    return priceDescriptions[priceRange];
  }

  // Function to update pagination controls.
  function updatePaginationControls(totalPages) {
    const paginationControls = document.getElementById("paginationControls");
    paginationControls.innerHTML = "";

    const prevBtn = document.createElement("button");
    prevBtn.textContent = "Previous";
    prevBtn.classList.add("pagination-btn");
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        updateLunchList();
      }
    });

    const pageInfo = document.createElement("div");
    pageInfo.classList.add("page-info");
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Next";
    nextBtn.classList.add("pagination-btn");
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        updateLunchList();
      }
    });

    paginationControls.appendChild(prevBtn);
    paginationControls.appendChild(pageInfo);
    paginationControls.appendChild(nextBtn);
  }

  // Handle form submission to add a new lunch entry.
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const restaurant = document.getElementById("restaurant").value.trim();
    const mapsLink = document.getElementById("mapsLink").value.trim();
    const cuisine = document.getElementById("cuisine").value.trim();
    const priceRange = parseInt(document.getElementById("priceRange").value);

    if (!restaurant || !mapsLink || !cuisine) {
      alert("Please fill in all required fields!");
      return;
    }

    try {
      await room.collection("lunch").create({
        restaurant,
        mapsLink,
        cuisine,
        priceRange: priceRange || null // Store null if no price range is selected
      });
      form.reset();
      selectedCuisineTags = []; // Reset selected tags
      updateCuisineTags();
    } catch (error) {
      console.error("Error saving lunch entry:", error);
      alert("Failed to save the entry. Please try again.");
    }
  });

  // Function to update the last randomized display
  async function updateLastRandomized() {
    const lastRandomized = room.collection('lastRandomized').getList();
    if (lastRandomized && lastRandomized.length > 0) {
      const latest = lastRandomized[0];
      randomizerResult.innerHTML = `<strong>${latest.restaurant}</strong> &mdash; ${latest.cuisine} (<a href="${latest.mapsLink}" target="_blank" rel="noopener noreferrer">View on Map</a>)`;
      randomizerResult.style.animation = "fadeIn 0.5s ease forwards";
    }
  }

  // Subscribe to lastRandomized changes
  room.collection('lastRandomized').subscribe((records) => {
    if (records && records.length > 0) {
      const latest = records[0];
      randomizerResult.innerHTML = `<strong>${latest.restaurant}</strong> &mdash; ${latest.cuisine} (<a href="${latest.mapsLink}" target="_blank" rel="noopener noreferrer">View on Map</a>)`;
      randomizerResult.style.animation = "fadeIn 0.5s ease forwards";
    }
  });

  // Randomizer functionality.
  randomizeBtn.addEventListener("click", async () => {
    const uniqueRestaurants = getUniqueRestaurants();
    if (uniqueRestaurants.length === 0) {
      randomizerResult.textContent = "No restaurants available.";
      return;
    }

    // Add suspense animation class and initial message
    randomizerResult.textContent = "Randomizing...";
    randomizerResult.classList.add('suspense');

    // Short delay to show the suspense animation
    setTimeout(async () => {
      randomizerResult.classList.remove('suspense'); // Remove suspense class after animation
      const picked = JSON.parse(localStorage.getItem("randomizerPicked")) || [];
      const available = uniqueRestaurants.filter((rec) => {
        const key = rec.restaurant.trim().toLowerCase();
        return !picked.includes(key);
      });

      if (available.length === 0) {
        randomizerResult.textContent =
          "All restaurants have been chosen for this week.";
        return;
      }

      const randomIndex = Math.floor(Math.random() * available.length);
      const chosen = available[randomIndex];

      // Populate modal content
      modalRestaurantName.textContent = chosen.restaurant;
      modalRestaurantCuisine.textContent = chosen.cuisine;
      modalRestaurantLink.href = chosen.mapsLink;

      // Show the modal
      randomizedModal.style.display = "block";

      picked.push(chosen.restaurant.trim().toLowerCase());
      localStorage.setItem("randomizerPicked", JSON.stringify(picked));
      
      // Update the last randomized restaurant in the collection
      // First, clear any existing entries
      const existing = room.collection('lastRandomized').getList();
      if (existing && existing.length > 0) {
        await room.collection('lastRandomized').delete(existing[0].id);
      }
      
      // Add the new randomized restaurant
      await room.collection('lastRandomized').create({
        restaurant: chosen.restaurant,
        cuisine: chosen.cuisine,
        mapsLink: chosen.mapsLink
      });

      // Trigger confetti
      confetti({
        particleCount: 200,
        spread: 70,
        origin: { y: 0.6 },
      });
    }, 1500); // 1.5 seconds delay for suspense
  });

  // Close modal functionality
  closeModalButton.addEventListener('click', () => {
    randomizedModal.style.display = "none";
  });

  window.addEventListener('click', (event) => {
    if (event.target == randomizedModal) {
      randomizedModal.style.display = "none";
    }
  });

  // Reset Randomizer functionality.
  resetRandomizerBtn.addEventListener("click", () => {
    localStorage.setItem("randomizerPicked", JSON.stringify([]));
    randomizerResult.textContent = "Randomizer reset. You can choose again!";
    randomizerResult.style.animation = "fadeIn 0.5s ease forwards";
  });

  // Subscribe to the persistent "lunch" collection.
  room.collection("lunch").subscribe((lunchRecords) => {
    currentLunchRecords = lunchRecords;
    updateLunchList();
    updateCuisineTags();
  });

  // Helper function to extract unique restaurants from current records.
  function getUniqueRestaurants() {
    const uniqueMap = {};
    currentLunchRecords.forEach((record) => {
      const key = record.restaurant.trim().toLowerCase();
      if (!uniqueMap[key]) {
        uniqueMap[key] = record;
      }
    });
    return Object.values(uniqueMap);
  }
}