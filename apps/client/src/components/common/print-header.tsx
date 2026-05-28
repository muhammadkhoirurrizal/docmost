import React from "react";
import classes from "./print-header.module.css";

export const PrintHeader = () => {
    const url = window.location.href;
    const title = document.title || "Untitled Document";
    const date = new Date().toLocaleDateString();

    return (
        <div className={classes.header}>
            <div className={classes.topRow}>
                <div className={classes.meta}>
                    <span className={classes.title}>{title}</span>
                    <span className={classes.date}>{date}</span>
                </div>
                <a href={url} className={classes.url}>{url}</a>
            </div>
            <div className={classes.divider} />
        </div>
    );
};
