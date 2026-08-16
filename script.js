/**
 * QRCreate — Next-Gen QR & Barcode Studio Client Engine
 */

// App State
const state = {
    engine: "qr", // 'qr' | 'barcode'
    contentType: "url", // 'url'|'text'|'wifi'|'vcard'|'email'|'sms'|'upi'|'phone'|'geo'|'event'|'crypto'
    drawer: "square", // 'square'|'dots'|'dashes'|'vertical'|'rounded'|'gapped'
    fillColor: "#000000",
    gradColor: "#000000",
    backColor: "#ffffff",
    gradientType: "none", // 'none'|'radial'|'horizontal'|'vertical'
    iconPreset: "none",
    logoData: null,
    logoSize: 0.22,
    logoPad: true,
    frameStyle: "none", // 'none'|'banner-bottom'|'banner-top'|'badge'|'polaroid'
    frameText: "SCAN ME",
    frameBg: "#18181b",
    errorCorrection: "H",
    border: 3,
    barcodeStandard: "code128",
    barcodeShowText: true,
    barHeight: 16,
    exportFormat: "png",
    exportSize: 1024,
    currentPayload: "",
    currentObjectUrl: null,
    rawSvgContent: null
};

// Preset SVGs for quick icons
const PRESET_ICONS = {
    link: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`,
    wifi: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>`,
    mail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
    star: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="#f59e0b" stroke="#d97706" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
    shield: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="#4f46e5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>`,
    github: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="#181717"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>`,
    whatsapp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="#25D366"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm5.77 14.12c-.24.67-1.38 1.28-1.92 1.35-.49.07-1.12.1-3.25-.79-2.73-1.14-4.5-3.89-4.64-4.07-.13-.18-1.1-1.46-1.1-2.79s.7-1.98.95-2.25c.25-.27.55-.34.73-.34.18 0 .37 0 .53.01.17.01.4.06.61.56.24.58.82 2.01.89 2.16.07.15.12.33.02.53-.1.2-.15.32-.3.49-.15.17-.32.38-.46.51-.15.15-.31.31-.13.62.18.31.8 1.32 1.72 2.14 1.18 1.05 2.18 1.38 2.49 1.53.31.15.49.13.67-.08.18-.21.79-.92 1-1.23.21-.31.42-.26.71-.15.29.11 1.84.87 2.16 1.03.32.16.53.24.61.37.08.13.08.76-.16 1.43z"/></svg>`,
    upi: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`
};

// DOM References
const mainCodeImage = document.getElementById("mainCodeImage");
const previewLoader = document.getElementById("previewLoader");
const emptyPreview = document.getElementById("emptyPreview");
const metaLength = document.getElementById("metaLength");
const metaFormat = document.getElementById("metaFormat");
const metaStyle = document.getElementById("metaStyle");
const previewTypeBadge = document.getElementById("previewTypeBadge");
const contrastMeter = document.getElementById("contrastMeter");
const contrastIcon = document.getElementById("contrastIcon");
const contrastTitle = document.getElementById("contrastTitle");
const contrastRatio = document.getElementById("contrastRatio");

let debounceTimer = null;
let cameraStream = null;
let scanAnimationId = null;

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initEngineSwitcher();
    initContentTypeChips();
    initPatternSelector();
    initPaletteChips();
    initColorPickers();
    initLogoUpload();
    initFrames();
    initActionButtons();
    initScannerModal();
    initHistoryDrawer();
    initFormInputs();
    initMobileAppEngine();

    // Initial code generation
    updatePayload();
});

/* ==========================================================
   Theme Management (Dark / Light)
   ========================================================== */
function initTheme() {
    const themeBtn = document.getElementById("themeToggleBtn");
    const sunIcon = document.getElementById("themeIconSun");
    const moonIcon = document.getElementById("themeIconMoon");

    const savedTheme = localStorage.getItem("qrcreate_theme") || "light";

    setTheme(savedTheme);

    themeBtn.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const nextTheme = currentTheme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
    });

    function setTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("qrcreate_theme", theme);
        if (theme === "dark") {
            sunIcon.hidden = false;
            moonIcon.hidden = true;
        } else {
            sunIcon.hidden = true;
            moonIcon.hidden = false;
        }
    }
}

/* ==========================================================
   Engine Switcher (QR Code vs 1D Barcode)
   ========================================================== */
function initEngineSwitcher() {
    const tabs = document.querySelectorAll(".segment-tab");
    const qrCategoryContainer = document.getElementById("qrCategoryContainer");
    const barcodeCategoryContainer = document.getElementById("barcodeCategoryContainer");
    const qrPatternSelector = document.getElementById("qrPatternSelector");
    const barcodeDensitySelector = document.getElementById("barcodeDensitySelector");
    const logoSection = document.getElementById("logoSectionContainer");
    const gradientGroup = document.getElementById("gradientColorGroup");
    const gradientSelector = document.getElementById("gradientSelectorGroup");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            state.engine = tab.dataset.engine;

            if (state.engine === "barcode") {
                qrCategoryContainer.hidden = true;
                barcodeCategoryContainer.hidden = false;
                qrPatternSelector.hidden = true;
                barcodeDensitySelector.hidden = false;
                logoSection.hidden = true;
                gradientGroup.hidden = true;
                gradientSelector.hidden = true;
                previewTypeBadge.textContent = "1D BARCODE";
            } else {
                qrCategoryContainer.hidden = false;
                barcodeCategoryContainer.hidden = true;
                qrPatternSelector.hidden = false;
                barcodeDensitySelector.hidden = true;
                logoSection.hidden = false;
                gradientGroup.hidden = false;
                gradientSelector.hidden = false;
                previewTypeBadge.textContent = "QR CODE";
            }

            updatePayload();
        });
    });

    // Barcode specific listeners
    document.getElementById("barcodeStandard").addEventListener("change", (e) => {
        state.barcodeStandard = e.target.value;
        scheduleRender();
    });

    document.getElementById("barcodeTextInput").addEventListener("input", () => {
        updatePayload();
    });

    document.getElementById("barcodeShowText").addEventListener("change", (e) => {
        state.barcodeShowText = e.target.checked;
        scheduleRender();
    });

    const barHeightSlider = document.getElementById("barHeightSlider");
    const barHeightVal = document.getElementById("barHeightVal");
    barHeightSlider.addEventListener("input", (e) => {
        state.barHeight = e.target.value;
        barHeightVal.textContent = `${e.target.value} mm`;
        scheduleRender();
    });
}

/* ==========================================================
   Content Types & Payload Generator
   ========================================================== */
function initContentTypeChips() {
    const chips = document.querySelectorAll(".type-chip");
    const panels = document.querySelectorAll(".input-panel");

    chips.forEach(chip => {
        chip.addEventListener("click", () => {
            chips.forEach(c => c.classList.remove("active"));
            panels.forEach(p => p.classList.remove("active"));

            chip.classList.add("active");
            state.contentType = chip.dataset.type;

            const targetPanel = document.getElementById(`panel-${state.contentType}`);
            if (targetPanel) {
                targetPanel.classList.add("active");
            }
            updatePayload();
        });
    });

    // Test URL button
    document.getElementById("testUrlBtn").addEventListener("click", () => {
        const url = document.getElementById("urlInput").value.trim();
        if (url) {
            window.open(url.startsWith("http") ? url : `https://${url}`, "_blank");
        }
    });

    // Wi-Fi auth toggle
    document.getElementById("wifiAuth").addEventListener("change", (e) => {
        const pwdGroup = document.getElementById("wifiPasswordGroup");
        pwdGroup.hidden = e.target.value === "nopass";
        updatePayload();
    });
}

function initFormInputs() {
    const inputs = document.querySelectorAll(
        "#panel-url input, #panel-text textarea, #panel-wifi input, #panel-wifi select, " +
        "#panel-vcard input, #panel-email input, #panel-email textarea, " +
        "#panel-sms input, #panel-sms textarea, #panel-upi input, " +
        "#panel-phone input, #panel-geo input, #panel-event input, " +
        "#panel-crypto input, #panel-crypto select"
    );

    inputs.forEach(input => {
        input.addEventListener("input", () => updatePayload());
        input.addEventListener("change", () => updatePayload());
    });
}

function updatePayload() {
    if (state.engine === "barcode") {
        state.currentPayload = document.getElementById("barcodeTextInput").value.trim();
        metaStyle.textContent = `Barcode (${state.barcodeStandard.toUpperCase()})`;
    } else {
        state.currentPayload = buildQrPayload(state.contentType);
        const drawerLabels = {
            dots: "● Dots (...)",
            dashes: "━ Dashes (--)",
            vertical: "┃ Vertical (||)",
            rounded: "▢ Rounded",
            gapped: "⊞ Gapped",
            square: "■ Classic"
        };
        metaStyle.textContent = drawerLabels[state.drawer] || state.drawer;
    }

    metaLength.textContent = `${state.currentPayload.length} chars`;

    const mobileLiveTag = document.getElementById("mobileLiveTag");
    if (mobileLiveTag) {
        if (state.engine === "barcode") {
            mobileLiveTag.textContent = `Barcode • ${state.barcodeStandard.toUpperCase()}`;
        } else {
            const labels = {
                square: "■ Classic",
                dots: "● Dots",
                dashes: "━ Dashes",
                vertical: "┃ Vertical",
                rounded: "▢ Rounded",
                gapped: "⊞ Gapped"
            };
            mobileLiveTag.textContent = `${labels[state.drawer] || state.drawer} • ${state.gradientType === 'none' ? 'Solid' : 'Gradient'}`;
        }
    }

    scheduleRender();
}

function buildQrPayload(type) {
    switch (type) {
        case "url": {
            let url = document.getElementById("urlInput").value.trim();
            if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
                url = `https://${url}`;
            }
            return url || "https://example.com";
        }
        case "text":
            return document.getElementById("textInput").value || "Welcome to QRCreate Studio!";
        case "wifi": {
            const ssid = document.getElementById("wifiSsid").value || "Home_WiFi";
            const auth = document.getElementById("wifiAuth").value;
            const pwd = document.getElementById("wifiPassword").value;
            const hidden = document.getElementById("wifiHidden").checked;
            return `WIFI:T:${auth};S:${ssid};P:${auth === "nopass" ? "" : pwd};H:${hidden};;`;
        }
        case "vcard": {
            const first = document.getElementById("vcardFirst").value.trim();
            const last = document.getElementById("vcardLast").value.trim();
            const phone = document.getElementById("vcardPhone").value.trim();
            const email = document.getElementById("vcardEmail").value.trim();
            const org = document.getElementById("vcardOrg").value.trim();
            const title = document.getElementById("vcardTitle").value.trim();
            const url = document.getElementById("vcardUrl").value.trim();

            const fullName = [first, last].filter(Boolean).join(" ");
            return [
                "BEGIN:VCARD",
                "VERSION:3.0",
                (first || last) ? `N:${last};${first};;;` : "",
                fullName ? `FN:${fullName}` : "",
                phone ? `TEL;TYPE=CELL:${phone}` : "",
                email ? `EMAIL:${email}` : "",
                org ? `ORG:${org}` : "",
                title ? `TITLE:${title}` : "",
                url ? `URL:${url}` : "",
                "END:VCARD"
            ].filter(Boolean).join("\n");
        }
        case "email": {
            const to = document.getElementById("emailTo").value;
            const sub = encodeURIComponent(document.getElementById("emailSubject").value);
            const body = encodeURIComponent(document.getElementById("emailBody").value);
            return `mailto:${to}?subject=${sub}&body=${body}`;
        }
        case "sms": {
            const phone = document.getElementById("smsPhone").value;
            const msg = document.getElementById("smsMessage").value;
            return `SMSTO:${phone}:${msg}`;
        }
        case "upi": {
            const vpa = document.getElementById("upiVpa").value.trim() || "merchant@upi";
            const rawName = document.getElementById("upiName").value.trim();
            const name = rawName ? encodeURIComponent(rawName) : "";
            const amt = document.getElementById("upiAmount").value.trim();
            const note = encodeURIComponent(document.getElementById("upiNote").value.trim());
            let upiUrl = `upi://pay?pa=${vpa}`;
            if (name) upiUrl += `&pn=${name}`;
            if (amt) upiUrl += `&am=${amt}&cu=INR`;
            if (note) upiUrl += `&tn=${note}`;
            return upiUrl;
        }
        case "phone": {
            const ph = document.getElementById("phoneInput").value;
            return `tel:${ph}`;
        }
        case "geo": {
            const lat = document.getElementById("geoLat").value || "37.7749";
            const lng = document.getElementById("geoLng").value || "-122.4194";
            return `geo:${lat},${lng}`;
        }
        case "event": {
            const title = document.getElementById("eventTitle").value || "Special Event";
            const start = document.getElementById("eventStart").value.replace(/[-:]/g, "");
            const end = document.getElementById("eventEnd").value.replace(/[-:]/g, "");
            const loc = document.getElementById("eventLocation").value;
            return [
                "BEGIN:VCALENDAR",
                "VERSION:2.0",
                "BEGIN:VEVENT",
                `SUMMARY:${title}`,
                start ? `DTSTART:${start}00Z` : "",
                end ? `DTEND:${end}00Z` : "",
                loc ? `LOCATION:${loc}` : "",
                "END:VEVENT",
                "END:VCALENDAR"
            ].filter(Boolean).join("\n");
        }
        case "crypto": {
            const curr = document.getElementById("cryptoCurrency").value;
            const addr = document.getElementById("cryptoAddress").value;
            const amt = document.getElementById("cryptoAmount").value;
            return `${curr}:${addr}${amt ? `?amount=${amt}` : ""}`;
        }
        default:
            return "QRCreate";
    }
}

/* ==========================================================
   Pattern & Module Drawer Controls (Dots, Dashes, Stripes)
   ========================================================== */
function initPatternSelector() {
    const cards = document.querySelectorAll(".pattern-card");
    cards.forEach(card => {
        card.addEventListener("click", () => {
            cards.forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            state.drawer = card.dataset.drawer;
            updatePayload();
        });
    });
}
