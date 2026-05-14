// This is the Blueprint
export interface Project {
  id: string;          // Must be text
  name: string;        // Must be text
  owner_id: string;    // Must be text
  team_id: string;     // Must be text
}

// This is the blueprint for your User
export interface User {
  user_id: string;
  username: string;
}