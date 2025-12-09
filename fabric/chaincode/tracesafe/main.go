// Copyright IBM Corp. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// TraceSafe Chaincode - Hyperledger Fabric Smart Contract
// Modeled after IBM Food Trust architecture

package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// TraceSafeContract provides functions for managing supply chain batches
type TraceSafeContract struct {
	contractapi.Contract
}

// Batch represents a produce batch in the supply chain
type Batch struct {
	DocType      string  `json:"docType"`
	BatchID      string  `json:"batchId"`
	FarmerID     string  `json:"farmerId"`
	FarmerName   string  `json:"farmerName"`
	AgriStackID  string  `json:"agriStackId"`
	Crop         string  `json:"crop"`
	Variety      string  `json:"variety"`
	Quantity     float64 `json:"quantity"`
	Unit         string  `json:"unit"`
	HarvestDate  string  `json:"harvestDate"`
	OriginLat    float64 `json:"originLat"`
	OriginLng    float64 `json:"originLng"`
	OriginAddr   string  `json:"originAddress"`
	Status       string  `json:"status"`
	CurrentOwner string  `json:"currentOwner"`
	CurrentOrg   string  `json:"currentOrg"`
	CreatedAt    string  `json:"createdAt"`
	UpdatedAt    string  `json:"updatedAt"`
}

// JourneyEvent represents a step in the supply chain journey
type JourneyEvent struct {
	DocType     string  `json:"docType"`
	EventID     string  `json:"eventId"`
	BatchID     string  `json:"batchId"`
	EventType   string  `json:"eventType"`
	Actor       string  `json:"actor"`
	ActorOrg    string  `json:"actorOrg"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	Temperature float64 `json:"temperature"`
	Humidity    float64 `json:"humidity"`
	Notes       string  `json:"notes"`
	Timestamp   string  `json:"timestamp"`
}

// Transfer represents an ownership transfer between organizations
type Transfer struct {
	DocType      string `json:"docType"`
	TransferID   string `json:"transferId"`
	BatchID      string `json:"batchId"`
	FromOrg      string `json:"fromOrg"`
	ToOrg        string `json:"toOrg"`
	FromActor    string `json:"fromActor"`
	ToActor      string `json:"toActor"`
	TransferType string `json:"transferType"`
	Timestamp    string `json:"timestamp"`
}

// InitLedger initializes the chaincode with sample data (optional)
func (t *TraceSafeContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	fmt.Println("TraceSafe Chaincode initialized")
	return nil
}

// CreateBatch creates a new batch on the blockchain
func (t *TraceSafeContract) CreateBatch(ctx contractapi.TransactionContextInterface,
	batchID, farmerID, farmerName, agriStackID, crop, variety string,
	quantity float64, unit, harvestDate string,
	originLat, originLng float64, originAddr string) error {

	// Check if batch already exists
	exists, err := t.BatchExists(ctx, batchID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("batch %s already exists", batchID)
	}

	// Get submitter identity and organization
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}

	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get MSP ID: %v", err)
	}

	// Only FarmerOrg can create batches
	if mspID != "FarmerOrgMSP" {
		return fmt.Errorf("only FarmerOrg can create batches, got %s", mspID)
	}

	now := time.Now().UTC().Format(time.RFC3339)

	batch := Batch{
		DocType:      "batch",
		BatchID:      batchID,
		FarmerID:     farmerID,
		FarmerName:   farmerName,
		AgriStackID:  agriStackID,
		Crop:         crop,
		Variety:      variety,
		Quantity:     quantity,
		Unit:         unit,
		HarvestDate:  harvestDate,
		OriginLat:    originLat,
		OriginLng:    originLng,
		OriginAddr:   originAddr,
		Status:       "created",
		CurrentOwner: clientID,
		CurrentOrg:   mspID,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	batchJSON, err := json.Marshal(batch)
	if err != nil {
		return err
	}

	// Record creation event
	eventID := fmt.Sprintf("%s-created", batchID)
	err = t.recordEvent(ctx, eventID, batchID, "created", farmerName, mspID,
		originLat, originLng, 0, 0, "Batch created by farmer")
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(batchID, batchJSON)
}

// RecordPickup records when a driver picks up a batch
func (t *TraceSafeContract) RecordPickup(ctx contractapi.TransactionContextInterface,
	batchID, driverName string, lat, lng float64, notes string) error {

	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return err
	}

	// Only DriverOrg can pickup
	if mspID != "DriverOrgMSP" {
		return fmt.Errorf("only DriverOrg can pickup batches")
	}

	batch, err := t.GetBatch(ctx, batchID)
	if err != nil {
		return err
	}

	if batch.Status != "created" {
		return fmt.Errorf("batch must be in 'created' status to pickup, got %s", batch.Status)
	}

	// Update batch
	clientID, _ := ctx.GetClientIdentity().GetID()
	batch.Status = "in_transit"
	batch.CurrentOwner = clientID
	batch.CurrentOrg = mspID
	batch.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	batchJSON, err := json.Marshal(batch)
	if err != nil {
		return err
	}

	// Record pickup event
	eventID := fmt.Sprintf("%s-pickup-%d", batchID, time.Now().Unix())
	err = t.recordEvent(ctx, eventID, batchID, "pickup", driverName, mspID,
		lat, lng, 0, 0, notes)
	if err != nil {
		return err
	}

	// Record transfer
	transferID := fmt.Sprintf("%s-transfer-%d", batchID, time.Now().Unix())
	err = t.recordTransfer(ctx, transferID, batchID, "FarmerOrgMSP", mspID,
		batch.FarmerName, driverName, "pickup")
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(batchID, batchJSON)
}

// RecordTransitUpdate records transit conditions during transport
func (t *TraceSafeContract) RecordTransitUpdate(ctx contractapi.TransactionContextInterface,
	batchID, driverName string, lat, lng, temp, humidity float64, notes string) error {

	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return err
	}

	if mspID != "DriverOrgMSP" {
		return fmt.Errorf("only DriverOrg can update transit")
	}

	batch, err := t.GetBatch(ctx, batchID)
	if err != nil {
		return err
	}

	if batch.Status != "in_transit" {
		return fmt.Errorf("batch must be in transit to update")
	}

	// Record transit event
	eventID := fmt.Sprintf("%s-transit-%d", batchID, time.Now().Unix())
	return t.recordEvent(ctx, eventID, batchID, "transit_update", driverName, mspID,
		lat, lng, temp, humidity, notes)
}

// RecordDelivery records when a batch is delivered to retailer
func (t *TraceSafeContract) RecordDelivery(ctx contractapi.TransactionContextInterface,
	batchID, driverName, retailerName string, lat, lng float64, notes string) error {

	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return err
	}

	if mspID != "DriverOrgMSP" {
		return fmt.Errorf("only DriverOrg can deliver batches")
	}

	batch, err := t.GetBatch(ctx, batchID)
	if err != nil {
		return err
	}

	if batch.Status != "in_transit" {
		return fmt.Errorf("batch must be in transit to deliver")
	}

	batch.Status = "delivered"
	batch.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	batchJSON, err := json.Marshal(batch)
	if err != nil {
		return err
	}

	// Record delivery event
	eventID := fmt.Sprintf("%s-delivery-%d", batchID, time.Now().Unix())
	err = t.recordEvent(ctx, eventID, batchID, "delivery", driverName, mspID,
		lat, lng, 0, 0, notes)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(batchID, batchJSON)
}

// RecordReceipt records when a retailer receives a batch
func (t *TraceSafeContract) RecordReceipt(ctx contractapi.TransactionContextInterface,
	batchID, retailerName string, lat, lng float64, notes string) error {

	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return err
	}

	if mspID != "RetailerOrgMSP" {
		return fmt.Errorf("only RetailerOrg can receive batches")
	}

	batch, err := t.GetBatch(ctx, batchID)
	if err != nil {
		return err
	}

	if batch.Status != "delivered" {
		return fmt.Errorf("batch must be delivered to receive")
	}

	clientID, _ := ctx.GetClientIdentity().GetID()
	batch.Status = "received"
	batch.CurrentOwner = clientID
	batch.CurrentOrg = mspID
	batch.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	batchJSON, err := json.Marshal(batch)
	if err != nil {
		return err
	}

	// Record receipt event
	eventID := fmt.Sprintf("%s-received-%d", batchID, time.Now().Unix())
	err = t.recordEvent(ctx, eventID, batchID, "received", retailerName, mspID,
		lat, lng, 0, 0, notes)
	if err != nil {
		return err
	}

	// Record transfer
	transferID := fmt.Sprintf("%s-transfer-%d", batchID, time.Now().Unix())
	err = t.recordTransfer(ctx, transferID, batchID, "DriverOrgMSP", mspID,
		"Driver", retailerName, "receipt")
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(batchID, batchJSON)
}

// RecordSale records when a batch is sold to customer
func (t *TraceSafeContract) RecordSale(ctx contractapi.TransactionContextInterface,
	batchID, retailerName, notes string) error {

	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return err
	}

	if mspID != "RetailerOrgMSP" {
		return fmt.Errorf("only RetailerOrg can sell batches")
	}

	batch, err := t.GetBatch(ctx, batchID)
	if err != nil {
		return err
	}

	if batch.Status != "received" {
		return fmt.Errorf("batch must be received to sell")
	}

	batch.Status = "sold"
	batch.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	batchJSON, err := json.Marshal(batch)
	if err != nil {
		return err
	}

	// Record sale event
	eventID := fmt.Sprintf("%s-sold-%d", batchID, time.Now().Unix())
	err = t.recordEvent(ctx, eventID, batchID, "sold", retailerName, mspID,
		0, 0, 0, 0, notes)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(batchID, batchJSON)
}

// GetBatch retrieves a batch from the ledger
func (t *TraceSafeContract) GetBatch(ctx contractapi.TransactionContextInterface,
	batchID string) (*Batch, error) {

	batchJSON, err := ctx.GetStub().GetState(batchID)
	if err != nil {
		return nil, fmt.Errorf("failed to read batch: %v", err)
	}
	if batchJSON == nil {
		return nil, fmt.Errorf("batch %s does not exist", batchID)
	}

	var batch Batch
	err = json.Unmarshal(batchJSON, &batch)
	if err != nil {
		return nil, err
	}

	return &batch, nil
}

// GetBatchHistory returns the complete history of a batch from the blockchain
func (t *TraceSafeContract) GetBatchHistory(ctx contractapi.TransactionContextInterface,
	batchID string) ([]map[string]interface{}, error) {

	historyIterator, err := ctx.GetStub().GetHistoryForKey(batchID)
	if err != nil {
		return nil, err
	}
	defer historyIterator.Close()

	var history []map[string]interface{}

	for historyIterator.HasNext() {
		modification, err := historyIterator.Next()
		if err != nil {
			return nil, err
		}

		var batch Batch
		if !modification.IsDelete {
			json.Unmarshal(modification.Value, &batch)
		}

		entry := map[string]interface{}{
			"txId":      modification.TxId,
			"timestamp": modification.Timestamp.AsTime().Format(time.RFC3339),
			"isDelete":  modification.IsDelete,
			"value":     batch,
		}
		history = append(history, entry)
	}

	return history, nil
}

// GetJourneyEvents returns all journey events for a batch
func (t *TraceSafeContract) GetJourneyEvents(ctx contractapi.TransactionContextInterface,
	batchID string) ([]*JourneyEvent, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"journeyEvent","batchId":"%s"}}`, batchID)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var events []*JourneyEvent

	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var event JourneyEvent
		err = json.Unmarshal(queryResult.Value, &event)
		if err != nil {
			return nil, err
		}
		events = append(events, &event)
	}

	return events, nil
}

// GetTransfers returns all transfers for a batch
func (t *TraceSafeContract) GetTransfers(ctx contractapi.TransactionContextInterface,
	batchID string) ([]*Transfer, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"transfer","batchId":"%s"}}`, batchID)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var transfers []*Transfer

	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var transfer Transfer
		err = json.Unmarshal(queryResult.Value, &transfer)
		if err != nil {
			return nil, err
		}
		transfers = append(transfers, &transfer)
	}

	return transfers, nil
}

// BatchExists checks if a batch exists
func (t *TraceSafeContract) BatchExists(ctx contractapi.TransactionContextInterface,
	batchID string) (bool, error) {

	batchJSON, err := ctx.GetStub().GetState(batchID)
	if err != nil {
		return false, err
	}
	return batchJSON != nil, nil
}

// QueryBatchesByStatus returns batches filtered by status
func (t *TraceSafeContract) QueryBatchesByStatus(ctx contractapi.TransactionContextInterface,
	status string) ([]*Batch, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"batch","status":"%s"}}`, status)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var batches []*Batch

	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var batch Batch
		err = json.Unmarshal(queryResult.Value, &batch)
		if err != nil {
			return nil, err
		}
		batches = append(batches, &batch)
	}

	return batches, nil
}

// QueryBatchesByOrg returns batches owned by a specific organization
func (t *TraceSafeContract) QueryBatchesByOrg(ctx contractapi.TransactionContextInterface,
	orgMSP string) ([]*Batch, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"batch","currentOrg":"%s"}}`, orgMSP)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var batches []*Batch

	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var batch Batch
		err = json.Unmarshal(queryResult.Value, &batch)
		if err != nil {
			return nil, err
		}
		batches = append(batches, &batch)
	}

	return batches, nil
}

// recordEvent is a helper function to record journey events
func (t *TraceSafeContract) recordEvent(ctx contractapi.TransactionContextInterface,
	eventID, batchID, eventType, actor, actorOrg string,
	lat, lng, temp, humidity float64, notes string) error {

	event := JourneyEvent{
		DocType:     "journeyEvent",
		EventID:     eventID,
		BatchID:     batchID,
		EventType:   eventType,
		Actor:       actor,
		ActorOrg:    actorOrg,
		Latitude:    lat,
		Longitude:   lng,
		Temperature: temp,
		Humidity:    humidity,
		Notes:       notes,
		Timestamp:   time.Now().UTC().Format(time.RFC3339),
	}

	eventJSON, err := json.Marshal(event)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(eventID, eventJSON)
}

// recordTransfer is a helper function to record ownership transfers
func (t *TraceSafeContract) recordTransfer(ctx contractapi.TransactionContextInterface,
	transferID, batchID, fromOrg, toOrg, fromActor, toActor, transferType string) error {

	transfer := Transfer{
		DocType:      "transfer",
		TransferID:   transferID,
		BatchID:      batchID,
		FromOrg:      fromOrg,
		ToOrg:        toOrg,
		FromActor:    fromActor,
		ToActor:      toActor,
		TransferType: transferType,
		Timestamp:    time.Now().UTC().Format(time.RFC3339),
	}

	transferJSON, err := json.Marshal(transfer)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(transferID, transferJSON)
}

func main() {
	chaincode, err := contractapi.NewChaincode(&TraceSafeContract{})
	if err != nil {
		fmt.Printf("Error creating TraceSafe chaincode: %v", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting TraceSafe chaincode: %v", err)
	}
}
