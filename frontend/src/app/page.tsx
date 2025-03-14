"use client"; // Required for using useRouter in Next.js App Router

import { useRouter } from "next/navigation";
import { Button } from "@mui/material";

export default function HomePage() {
    const router = useRouter();

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" }}>
            <h1>Welcome to the Home Page</h1>
            <Button 
                variant="contained" 
                color="primary" 
                onClick={() => router.push("/createQuiz")}
            >
                Start Now
            </Button>
        </div>
    );
}
