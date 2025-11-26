/**
 * DOM Utility Functions
 * Helper functions for DOM manipulation
 */

/**
 * Clear all child nodes from a DOM element
 * @param {HTMLElement} node - The node to clear
 */
export function clearNode(node) {
    if (!node) {
        return;
    }
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}

/**
 * Create a DOM element with optional class and text content
 * @param {string} tag - HTML tag name
 * @param {string} [className] - CSS class name
 * @param {string} [textContent] - Text content
 * @returns {HTMLElement}
 */
export function createElement(tag, className, textContent) {
    const el = document.createElement(tag);
    if (className) {
        el.className = className;
    }
    if (textContent !== undefined && textContent !== null) {
        el.textContent = textContent;
    }
    return el;
}

/**
 * Toggle the 'hidden' class on an element
 * @param {HTMLElement} element - The element to toggle
 * @param {boolean} hide - Whether to hide (true) or show (false)
 */
export function toggleHidden(element, hide) {
    if (!element) {
        return;
    }
    if (hide) {
        element.classList.add("hidden");
    } else {
        element.classList.remove("hidden");
    }
}

/**
 * Set the disabled state of an element
 * @param {HTMLElement} element - The element to modify
 * @param {boolean} disabled - Whether to disable the element
 */
export function setDisabled(element, disabled) {
    if (!element) {
        return;
    }
    if (disabled) {
        element.setAttribute("disabled", "disabled");
    } else {
        element.removeAttribute("disabled");
    }
}

/**
 * Add a CSS class to an element
 * @param {HTMLElement} element - The element
 * @param {string} className - The class name to add
 */
export function addClass(element, className) {
    if (element && className) {
        element.classList.add(className);
    }
}

/**
 * Remove a CSS class from an element
 * @param {HTMLElement} element - The element
 * @param {string} className - The class name to remove
 */
export function removeClass(element, className) {
    if (element && className) {
        element.classList.remove(className);
    }
}

/**
 * Check if an element has a CSS class
 * @param {HTMLElement} element - The element
 * @param {string} className - The class name to check
 * @returns {boolean}
 */
export function hasClass(element, className) {
    return element && className ? element.classList.contains(className) : false;
}
