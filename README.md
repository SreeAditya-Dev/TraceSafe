# TraceSafe 🛡️
> **Blockchain-Enabled Supply Chain Transparency Platform**

TraceSafe is a next-generation supply chain management system designed to bring transparency, trust, and efficiency to the agricultural journey from farm to fork. Built for the GLYTCH hackathon.

## 🌟 Key Features

### 🔗 Blockchain Integration (Hyperledger Fabric)
*   **Immutable Ledger:** All critical events (harvest, pickup, transit, delivery) are recorded on a private, permissioned blockchain.
*   **Smart Contracts:** Business logic for batch lifecycle and certification is enforced by chaincode.
*   **Multi-Org Architecture:** Simulates a real-world consortium with Farmer, Driver, Retailer, and Regulator organizations.

### 🏅 Smart Certification
*   **Blockchain-Backed Certificates:** Admins can issue immutable certificates for batches that meet quality standards.
*   **Tamper-Proof:** Certificates are stored on the ledger and cannot be forged.
*   **Customer Verification:** End consumers can scan a QR code to see the "TraceSafe Certified" badge and verify authenticity.

### 🛡️ Integrity Verification
*   **Automated Auditing:** The "Integrity Verification" feature instantly cross-checks the local database against the blockchain ledger.
*   **Tamper Detection:** Detects any discrepancies in status or certification data.
*   **Self-Healing:** Automatically syncs the local state if the blockchain is ahead (e.g., if a batch was certified but the DB update failed).

### 🚜 Farmer-Centric Design
*   **AgriStack Integration:** Seamless login for farmers using their government AgriStack IDs.
*   **FSSAI Compliance:** Tracks and displays FSSAI license numbers for regulatory compliance.
*   **Profile Management:** Farmers can manage their profiles, crops, and land details.

### 📦 Complete Journey Tracking
*   **Visual Timeline:** Full history of the batch from harvest to sale.
*   **IoT Data:** Tracks temperature and humidity during transit (simulated).
*   **Media Evidence:** Stores images of the produce at every stage.

## 🛠️ Tech Stack
*   **Frontend:** React, TypeScript, Tailwind CSS, Lucide Icons
*   **Backend:** Node.js, Express, PostgreSQL
*   **Blockchain:** Hyperledger Fabric v2.5
*   **Storage:** MinIO (S3-compatible object storage for images)
*   **Containerization:** Docker & Docker Compose

## 🚀 Getting Started

### Prerequisites
*   Docker & Docker Compose
*   Node.js (v18+)

### Installation
1.  **Start the Infrastructure:**
    ```bash
    docker-compose up -d
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    cd backend && npm install
    ```
3.  **Run the Application:**
    ```bash
    # Terminal 1: Backend
    cd backend && npm run dev

    # Terminal 2: Frontend
    npm run dev
    ```

## 👥 User Roles
*   **Admin:** `admin@tracesafe.com` (Regulator/System Admin)
*   **Farmer:** Login via AgriStack ID
*   **Retailer:** `retailer@tracesafe.com`
*   **Driver:** `driver@tracesafe.com`

## Screen

### Landing & Authentication
![TraceSafe Login](https://res.cloudinary.com/dukjtmdtn/image/upload/v1765949710/1_mjucqb.jpg)
### 🔗 Blockchain Integration (Hyperledger Fabric)
![Admin Dashboard – Batches](https://res.cloudinary.com/dukjtmdtn/image/upload/v1765949715/2_alksw3.jpg)
### 🏅 Smart Certification
![Batch Certification](https://res.cloudinary.com/dukjtmdtn/image/upload/v1765949722/4_p6b5l3.jpg)
### 🛡️ Integrity Verification
![Integrity Verification](https://res.cloudinary.com/dukjtmdtn/image/upload/v1765949728/7_hfmkce.jpg)
### 🚜 Farmer-Centric Design
![Farmer Dashboard](https://res.cloudinary.com/dukjtmdtn/image/upload/v1765949737/WhatsApp_Image_2025-12-10_at_2.19.19_PM_ica7da.jpg)
### 📦 Batch Creation & Evidence Capture
![Create Batch](https://res.cloudinary.com/dukjtmdtn/image/upload/v1765949745/WhatsApp_Image_2025-12-10_at_2.22.17_PM_cgatlw.jpg)
### 🧭 Complete Journey Tracking
![Journey Timeline](https://res.cloudinary.com/dukjtmdtn/image/upload/v1765949752/WhatsApp_Image_2025-12-10_at_2.24.39_PM_ykezrz.jpg)
### 🏆 Hackathon Recognition
![GLYTCH Certificate](https://res.cloudinary.com/dukjtmdtn/image/upload/v1765949768/WhatsApp_Image_2025-12-10_at_2.26.26_PM_npqw9t.jpg)

