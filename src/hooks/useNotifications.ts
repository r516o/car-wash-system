// src/hooks/useNotifications.ts

import { useState } from 'react'

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([])
  
  return {
    notifications,
    sendNotification: () => {},
  }
}
