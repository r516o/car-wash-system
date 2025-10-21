// src/hooks/useGeolocation.ts

import { useState } from 'react'

export const useGeolocation = () => {
  const [location, setLocation] = useState(null)
  
  return {
    location,
    getCurrentLocation: () => {},
  }
}
