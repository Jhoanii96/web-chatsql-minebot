const autocompleteTags = ['{{equipment}}', '{{startdate}}', '{{enddate}}', '{{starttime}}', '{{endtime}}', '{{datadictionary}}'];
let selectedIndex = -1;

function initAutocompleteForRow(row_id) {
    const textarea = document.getElementById('sql_prompt_' + row_id);
    const autocompleteContainer = document.getElementById('autocomplete-container_' + row_id);
    selectedIndex = -1;
    textarea.addEventListener('input', function () {
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = textarea.value.slice(0, cursorPos);
        const match = textBeforeCursor.match(/\{{2}$/);

        if (match) {
            showAutocomplete(cursorPos, row_id);
        } else {
            hideAutocomplete(row_id);
        }
    });

    textarea.addEventListener('keydown', function (e) {
        const items = autocompleteContainer.querySelectorAll('div');
        if (items.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = (selectedIndex + 1) % items.length;
                highlightItem(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                highlightItem(items);
            } else if (e.key === 'Enter' && selectedIndex > -1) {
                e.preventDefault();
                items[selectedIndex].click();
            }
        }
    });

    // Hide autocomplete on blur
    textarea.addEventListener('blur', hideAutocomplete(row_id));

    // Keep autocomplete visible when clicking inside it
    autocompleteContainer.addEventListener('mousedown', function (event) {
        event.preventDefault(); // Prevent textarea from losing focus
    });
}

function showAutocomplete(cursorPos, row_id) {
    // Get cursor position and show autocomplete there
    const textarea = document.getElementById('sql_prompt_' + row_id);
    const autocompleteContainer = document.getElementById('autocomplete-container_' + row_id);
    const cursorCoordinates = getCursorCoordinates(textarea);
    autocompleteContainer.style.top = `${cursorCoordinates.top}px`;
    autocompleteContainer.style.left = `${cursorCoordinates.left}px`;

    autocompleteContainer.innerHTML = autocompleteTags
        .map((tag, index) => `<div data-index="${index}" onclick="insertTag('${tag}', ${cursorPos}, '${row_id}')">${tag}</div>`)
        .join('');
    autocompleteContainer.classList.add('autocomplete-list');
    selectedIndex = -1;
}

function hideAutocomplete(row_id) {
    const autocompleteContainer = document.getElementById('autocomplete-container_' + row_id);
    autocompleteContainer.innerHTML = '';
    selectedIndex = -1;
}

function insertTag(tag, cursorPos, row_id) {
    const textarea = document.getElementById('sql_prompt_' + row_id);
    const text = textarea.value;
    const textBeforeCursor = text.slice(0, cursorPos - 2); // Removing the `{{`
    const textAfterCursor = text.slice(cursorPos);

    textarea.value = textBeforeCursor + tag + textAfterCursor;

    const newCursorPos = textBeforeCursor.length + tag.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);

    hideAutocomplete(row_id);
}

function highlightItem(items) {
    items.forEach((item, index) => {
        item.classList.toggle('active', index === selectedIndex);
    });
}

function getCursorCoordinates(element) {
    const tableObject = document.getElementById("PhaseTable");
    const rect0 = tableObject.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const top_val = rect.top - rect0.top + (rect.height/2);
    return {
        top: top_val,
        left: rect.left
    };
}
