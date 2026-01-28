/**
 * Example API Usage - Demonstrates how to use the user management APIs
 * Run these in your browser console or in a test client
 */

// ============================================================
// AUTHENTICATION SETUP
// ============================================================

// First, ensure you're logged in via Supabase auth
// Then get the JWT token:

async function getAuthToken() {
  const supabase = window.supabase // Assuming supabase initialized globally
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token
}

// ============================================================
// USER MANAGEMENT API EXAMPLES
// ============================================================

/**
 * Get all users in current user's organization
 */
async function listUsers() {
  const token = await getAuthToken()

  const response = await fetch('/api/users?limit=50&offset=0', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error:', error)
    return
  }

  const data = await response.json()
  console.log('Users:', data)
  return data
}

/**
 * Create a new user
 */
async function createUser(userData) {
  const token = await getAuthToken()

  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: userData.email,
      password: userData.password,
      first_name: userData.firstName,
      last_name: userData.lastName,
      role_type: userData.role, // 'carer', 'customer', 'service_provider', etc.
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error creating user:', error)
    return
  }

  const data = await response.json()
  console.log('User created:', data)
  return data
}

/**
 * Get specific user details
 */
async function getUser(userId) {
  const token = await getAuthToken()

  const response = await fetch(`/api/users/${userId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error:', error)
    return
  }

  const data = await response.json()
  console.log('User:', data)
  return data
}

/**
 * Update user information
 */
async function updateUser(userId, updates) {
  const token = await getAuthToken()

  const response = await fetch(`/api/users/${userId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error updating user:', error)
    return
  }

  const data = await response.json()
  console.log('User updated:', data)
  return data
}

/**
 * Delete a user (superadmin only)
 */
async function deleteUser(userId) {
  const token = await getAuthToken()

  const response = await fetch(`/api/users/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Error deleting user:', error)
    return
  }

  const data = await response.json()
  console.log('User deleted:', data)
  return data
}

// ============================================================
// USAGE EXAMPLES
// ============================================================

/**
 * Example 1: List all users
 */
async function example1() {
  console.log('Fetching users...')
  const users = await listUsers()
  users.data.forEach((user) => {
    console.log(
      `${user.first_name} ${user.last_name} (${user.email}) - ${user.user_roles.role_type}`
    )
  })
}

/**
 * Example 2: Create a new carer
 */
async function example2() {
  console.log('Creating new carer...')
  const newCarer = await createUser({
    email: 'john.doe@example.com',
    password: 'SecurePassword123!',
    firstName: 'John',
    lastName: 'Doe',
    role: 'carer',
  })

  console.log('Created:', newCarer)
}

/**
 * Example 3: Update user's name
 */
async function example3(userId) {
  console.log('Updating user...')
  const updated = await updateUser(userId, {
    first_name: 'Jane',
    last_name: 'Smith',
  })

  console.log('Updated:', updated)
}

/**
 * Example 4: Create multiple users
 */
async function example4() {
  const users = [
    {
      email: 'carer1@example.com',
      password: 'Pass123!',
      firstName: 'Alice',
      lastName: 'Johnson',
      role: 'carer',
    },
    {
      email: 'carer2@example.com',
      password: 'Pass123!',
      firstName: 'Bob',
      lastName: 'Smith',
      role: 'carer',
    },
    {
      email: 'manager@example.com',
      password: 'Pass123!',
      firstName: 'Charlie',
      lastName: 'Brown',
      role: 'service_provider',
    },
  ]

  for (const user of users) {
    console.log(`Creating ${user.firstName}...`)
    await createUser(user)
    // Add delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}

/**
 * Example 5: Get user and show role details
 */
async function example5(userId) {
  const user = await getUser(userId)

  console.log('User Details:')
  console.log(`  Name: ${user.first_name} ${user.last_name}`)
  console.log(`  Email: ${user.email}`)
  console.log(`  Role: ${user.user_roles.role_type}`)
  console.log(`  Active: ${user.is_active}`)
  console.log(`  Created: ${new Date(user.created_at).toLocaleDateString()}`)
}

/**
 * Example 6: Deactivate a user
 */
async function example6(userId) {
  console.log('Deactivating user...')
  const updated = await updateUser(userId, {
    is_active: false,
  })

  console.log('User deactivated:', updated.is_active)
}

// ============================================================
// RUN EXAMPLES
// ============================================================

/*
// To run an example, call it in the browser console:

// List all users
await example1()

// Create new carer
await example2()

// Update user (replace 'USER_ID' with actual ID)
await example3('USER_ID')

// Create multiple users
await example4()

// Get user details (replace 'USER_ID' with actual ID)
await example5('USER_ID')

// Deactivate user (replace 'USER_ID' with actual ID)
await example6('USER_ID')
*/

// ============================================================
// CURL EXAMPLES (for testing in terminal)
// ============================================================

/*

# Set token
TOKEN="your_jwt_token_here"
ORG_ID="your_org_id"

# List users
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN"

# Create user
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "first_name": "John",
    "last_name": "Doe",
    "role_type": "carer"
  }'

# Get user
curl -X GET http://localhost:3000/api/users/user-id \
  -H "Authorization: Bearer $TOKEN"

# Update user
curl -X PUT http://localhost:3000/api/users/user-id \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane"
  }'

# Delete user (superadmin only)
curl -X DELETE http://localhost:3000/api/users/user-id \
  -H "Authorization: Bearer $TOKEN"

*/

// ============================================================
// TYPESCRIPT TYPES
// ============================================================

interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
  org_id?: string
  is_active: boolean
  created_at: string
  last_login_at?: string
  user_roles: {
    role_type: string
    id: string
  }
}

interface CreateUserRequest {
  email: string
  password: string
  first_name?: string
  last_name?: string
  role_type: string
}

interface UpdateUserRequest {
  first_name?: string
  last_name?: string
  is_active?: boolean
  user_role_id?: string // superadmin only
}

interface ListUsersResponse {
  data: User[]
  count: number
  limit: number
  offset: number
}

// ============================================================
// ERROR HANDLING
// ============================================================

async function createUserWithErrorHandling(userData: CreateUserRequest) {
  try {
    const token = await getAuthToken()

    if (!token) {
      throw new Error('Not authenticated. Please log in first.')
    }

    const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    })

    // Handle different error codes
    switch (response.status) {
      case 400:
        const validation = await response.json()
        throw new Error(`Validation error: ${validation.error}`)

      case 401:
        throw new Error('Unauthorized. Your session may have expired.')

      case 403:
        throw new Error('Forbidden. You do not have permission to create users.')

      case 409:
        throw new Error('User with this email already exists.')

      case 500:
        throw new Error('Server error. Please try again later.')

      default:
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
    }

    const user = await response.json()
    return {
      success: true,
      user,
      message: `User ${userData.email} created successfully.`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Usage with error handling
/*
const result = await createUserWithErrorHandling({
  email: 'test@example.com',
  password: 'SecurePass123!',
  first_name: 'Test',
  last_name: 'User',
  role_type: 'carer',
})

if (result.success) {
  console.log(result.message)
  console.log('Created user:', result.user)
} else {
  console.error('Failed to create user:', result.error)
}
*/
