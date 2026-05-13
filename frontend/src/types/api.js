/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} email
 * @property {string} full_name
 * @property {string} phone
 * @property {boolean} is_active
 * @property {string} role
 * @property {string} [city]
 * @property {string} [date_joined]
 */

/**
 * @typedef {Object} ServiceCategory
 * @property {number} id
 * @property {string} name
 * @property {string} description
 * @property {string} icon
 * @property {boolean} is_active
 * @property {number} [subcategory_count]
 */

/**
 * @typedef {Object} ServiceSubcategory
 * @property {number} id
 * @property {number} category
 * @property {string} name
 * @property {string} description
 * @property {number} base_price
 * @property {number} estimated_duration_hours
 * @property {boolean} is_active
 * @property {string} [category_name]
 */

/**
 * @typedef {Object} Provider
 * @property {number} id
 * @property {Object} user
 * @property {string} user.full_name
 * @property {string} user.email
 * @property {string} user.city
 * @property {number} [average_rating]
 * @property {boolean} is_available
 * @property {string} [status]
 */

/**
 * @typedef {Object} Booking
 * @property {number} id
 * @property {Object} customer
 * @property {Object} provider
 * @property {Object} subcategory
 * @property {string} booking_date
 * @property {number} quoted_price
 * @property {number} [final_price]
 * @property {string} status
 */
