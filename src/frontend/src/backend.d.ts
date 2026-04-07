import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface AreaDto {
    id: bigint;
    name: string;
    districtId: bigint;
    isAssigned: boolean;
}
export interface DistrictDto {
    id: bigint;
    name: string;
    isAssigned: boolean;
}
export interface UserDto {
    id: bigint;
    contact: string;
    username: string;
    districtId: bigint;
    passwordHash: string;
}
export interface AreaManagerDto {
    id: bigint;
    status: AreaManagerStatus;
    contact: string;
    username: string;
    districtId: bigint;
    areaId: bigint;
    passwordHash: string;
}
export interface DistrictManagerDto {
    id: bigint;
    status: DistrictManagerStatus;
    contact: string;
    username: string;
    districtId: bigint;
    passwordHash: string;
}
export interface BloodRequestDto {
    id: bigint;
    age: bigint;
    status: BloodRequestStatus;
    contact: string;
    operationDate: string;
    createdAt: bigint;
    toId: bigint;
    hospitalAddress: string;
    toRole: string;
    bloodGroup: string;
    fromRole: string;
    patientName: string;
    altContact?: string;
    attenderName: string;
    fromId: bigint;
    hospitalName: string;
}
export interface DonorDto {
    id: bigint;
    age: bigint;
    status: DonorStatus;
    contact: string;
    appointedAt?: bigint;
    name: string;
    districtId: bigint;
    rejectedAt?: bigint;
    bloodGroup: string;
    lastDonatedDate?: bigint;
    patientName?: string;
    areaId: bigint;
    areaManagerId: bigint;
    tempRejectedUntil?: bigint;
    tempRejectedReason?: string;
}
export interface NoticeDto {
    id: bigint;
    createdAt: bigint;
    toId?: bigint;
    toRole: string;
    message: string;
    fromRole: string;
    fromId: bigint;
}
export interface MessageDto {
    id: bigint;
    fromRole: string;
    fromId: bigint;
    toRole: string;
    toId: bigint;
    content: string;
    createdAt: bigint;
}
export interface FeedbackDto {
    id: bigint;
    fromRole: string;
    fromId: bigint;
    toRole: string;
    toId?: bigint;
    itemType: string;
    message: string;
    createdAt: bigint;
}
export interface UserProfile {
    amId?: bigint;
    userId?: bigint;
    dmId?: bigint;
    name: string;
    role: string;
}
export enum BloodRequestStatus {
    forwarded = "forwarded",
    pending = "pending",
    completed = "completed"
}
export enum DistrictManagerStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum DonorStatus {
    appointed = "appointed",
    tempRejected = "tempRejected",
    available = "available",
    permRejected = "permRejected"
}
export enum AreaManagerStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addDonor(name: string, contact: string, bloodGroup: string, districtId: bigint, areaId: bigint, age: bigint, lastDonatedDate: bigint | null, areaManagerId: bigint): Promise<DonorDto>;
    approveAreaManager(dmId: bigint, amId: bigint): Promise<AreaManagerDto>;
    approveDistrictManager(dmId: bigint): Promise<DistrictManagerDto>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    completeBloodRequest(requestId: bigint): Promise<BloodRequestDto>;
    createArea(dmId: bigint, districtId: bigint, name: string): Promise<AreaDto>;
    createBloodRequest(fromRole: string, fromId: bigint, toRole: string, toId: bigint, patientName: string, age: bigint, bloodGroup: string, hospitalName: string, hospitalAddress: string, attenderName: string, contact: string, altContact: string | null, operationDate: string): Promise<BloodRequestDto>;
    createDistrict(name: string): Promise<DistrictDto>;
    deleteAreaManager(dmId: bigint, amId: bigint): Promise<void>;
    deleteDistrictManager(dmId: bigint): Promise<void>;
    deleteDonor(donorId: bigint): Promise<void>;
    forwardBloodRequest(requestId: bigint, toRole: string, toId: bigint): Promise<BloodRequestDto>;
    getAllApprovedAreaManagers(): Promise<Array<AreaManagerDto>>;
    getAllFeedback(): Promise<Array<FeedbackDto>>;
    getAllUsers(): Promise<Array<UserDto>>;
    getApprovedAreaManagersByDistrict(districtId: bigint): Promise<Array<AreaManagerDto>>;
    getApprovedDistrictManagers(): Promise<Array<DistrictManagerDto>>;
    getArea(id: bigint): Promise<AreaDto>;
    getAreaManager(amId: bigint): Promise<AreaManagerDto>;
    getAreasByDistrict(districtId: bigint): Promise<Array<AreaDto>>;
    getBloodRequestsForRecipient(toRole: string, toId: bigint): Promise<Array<BloodRequestDto>>;
    getBloodRequestsBySender(fromRole: string, fromId: bigint): Promise<Array<BloodRequestDto>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getConversationsForUser(role: string, id: bigint): Promise<Array<MessageDto>>;
    getDistrict(id: bigint): Promise<DistrictDto>;
    getDistrictManager(dmId: bigint): Promise<DistrictManagerDto>;
    getDistricts(): Promise<Array<DistrictDto>>;
    getDonorsByArea(areaId: bigint): Promise<Array<DonorDto>>;
    getFeedbackForDashboard(role: string, id: bigint): Promise<Array<FeedbackDto>>;
    getMessagesInThread(role1: string, id1: bigint, role2: string, id2: bigint): Promise<Array<MessageDto>>;
    getNoticesForRecipient(role: string, id: bigint): Promise<Array<NoticeDto>>;
    getPendingAreaManagersForDistrict(districtId: bigint): Promise<Array<AreaManagerDto>>;
    getPendingDistrictManagers(): Promise<Array<DistrictManagerDto>>;
    getUser(userId: bigint): Promise<UserDto>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    registerAreaManager(username: string, contact: string, passwordHash: string, districtId: bigint, areaId: bigint): Promise<AreaManagerDto>;
    registerDistrictManager(username: string, contact: string, passwordHash: string, districtId: bigint): Promise<DistrictManagerDto>;
    registerUser(username: string, contact: string, passwordHash: string, districtId: bigint): Promise<UserDto>;
    rejectAreaManager(dmId: bigint, amId: bigint): Promise<AreaManagerDto>;
    rejectDistrictManager(dmId: bigint): Promise<DistrictManagerDto>;
    restoreDonor(donorId: bigint): Promise<DonorDto>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendMessage(fromRole: string, fromId: bigint, toRole: string, toId: bigint, content: string): Promise<MessageDto>;
    sendNotice(fromRole: string, fromId: bigint, toRole: string, toId: bigint | null, message: string): Promise<NoticeDto>;
    submitFeedback(fromRole: string, fromId: bigint, toRole: string, toId: bigint | null, itemType: string, message: string): Promise<FeedbackDto>;
    updateDonorStatus(donorId: bigint, status: DonorStatus, rejectedAt: bigint | null, appointedAt: bigint | null, patientName: string | null, tempRejectedUntil: bigint | null, tempRejectedReason: string | null): Promise<DonorDto>;
}
