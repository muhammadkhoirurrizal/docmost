import React from "react";
import classes from "./print-header.module.css";

export const PrintHeader = () => {
    const url = window.location.href;

    return (
        <div className={classes.header}>
            <div className={classes.topRow}>
                <a href={url} className={classes.url}>{url}</a>
            </div>
        </div>
    );
};
