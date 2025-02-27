"use client";
import React, { useEffect } from "react";
import IAMService from "@/lib/IAMService";

export default function RedirectPage() {
  // This is the authentication callback page that securely fetch the JWT access token and redirects (stateless) session to the protected page
  useEffect(() => {
    IAMService.initIAM((authenticated) => {
        if(authenticated){
            window.location.href = "/authenticated/account";
        }else {
            window.location.href = "/";
          }
    });
  }, []);

  return;
}