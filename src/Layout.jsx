import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Components/Navbar/Navbar'
import Footer from './Components/Ayala/Project/Footer/Footer'

export default function Layout() {
  return <>
    <Navbar />
    <Outlet/>
    {/* <Footer/> */}
  </>
}
