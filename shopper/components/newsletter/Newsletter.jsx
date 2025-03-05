import React from 'react'
import "./Newsletter.css"



const Newsletter = () => {
  return (
    <div className='newsletter'>
        <h1>Get Exclusive Offers On Your Email</h1>
        <p>Subscribe to our newsletter and stay updated</p>
        <div className="input-email">
            <input type="email" placeholder='YOUR EMAIL ID' />
            <button>Subscribe</button>
        </div>
    </div>
  )
}

export default Newsletter
