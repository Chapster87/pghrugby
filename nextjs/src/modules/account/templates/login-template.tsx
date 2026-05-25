"use client"

import { useState } from "react"

import Register from "@modules/account/components/register"
import Login from "@modules/account/components/login"

import s from "./login.module.css"

export enum LOGIN_VIEW {
  SIGN_IN = "sign-in",
  REGISTER = "register",
}

const LoginTemplate = () => {
  const [currentView, setCurrentView] = useState("sign-in")

  return (
    <div className={s.loginContainer}>
      {currentView === "sign-in" ? (
        <Login setCurrentView={setCurrentView} />
      ) : (
        <Register setCurrentView={setCurrentView} />
      )}
    </div>
  )
}

export default LoginTemplate
