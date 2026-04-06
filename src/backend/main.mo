import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // -------------------------------------------------- COMPONENTS -------------------------------------------------- //
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // -------------------------------------------------- DTOs & Modules -------------------------------------------------- //

  type DistrictDto = {
    id : Nat;
    name : Text;
    isAssigned : Bool;
  };

  type AreaDto = {
    id : Nat;
    districtId : Nat;
    name : Text;
    isAssigned : Bool;
  };

  type DistrictManagerStatus = {
    #pending;
    #approved;
    #rejected;
  };

  type DonorStatus = {
    #available;
    #appointed;
    #tempRejected;
    #permRejected;
  };

  type DistrictManagerDto = {
    id : Nat;
    username : Text;
    contact : Text;
    passwordHash : Text;
    districtId : Nat;
    status : DistrictManagerStatus;
  };

  module DistrictManagerDto {
    public func compare(d1 : DistrictManagerDto, d2 : DistrictManagerDto) : Order.Order {
      Nat.compare(d1.id, d2.id);
    };
  };

  type AreaManagerStatus = {
    #pending;
    #approved;
    #rejected;
  };

  type AreaManagerDto = {
    id : Nat;
    username : Text;
    contact : Text;
    passwordHash : Text;
    districtId : Nat;
    areaId : Nat;
    status : AreaManagerStatus;
  };

  // V1 donor shape: the original record stored in stable memory.
  // Declaring `donors` with this type lets Motoko accept the upgrade
  // (old data is compatible with this type). postupgrade then migrates
  // to `donorsV2` which includes the new fields.
  type DonorDtoV1 = {
    id : Nat;
    name : Text;
    contact : Text;
    bloodGroup : Text;
    districtId : Nat;
    areaId : Nat;
    age : Nat;
    lastDonatedDate : ?Int;
    status : DonorStatus;
    rejectedAt : ?Int;
    appointedAt : ?Int;
    patientName : ?Text;
    areaManagerId : Nat;
  };

  // Current donor shape
  type DonorDto = {
    id : Nat;
    name : Text;
    contact : Text;
    bloodGroup : Text;
    districtId : Nat;
    areaId : Nat;
    age : Nat;
    lastDonatedDate : ?Int;
    status : DonorStatus;
    rejectedAt : ?Int;
    appointedAt : ?Int;
    patientName : ?Text;
    areaManagerId : Nat;
    tempRejectedUntil : ?Int;
    tempRejectedReason : ?Text;
  };

  module DonorDto {
    public func compare(d1 : DonorDto, d2 : DonorDto) : Order.Order {
      Nat.compare(d1.id, d2.id);
    };
  };

  type UserDto = {
    id : Nat;
    username : Text;
    contact : Text;
    passwordHash : Text;
    districtId : Nat;
  };

  public type UserProfile = {
    userId : ?Nat;
    dmId : ?Nat;
    amId : ?Nat;
    role : Text;
    name : Text;
  };

  type BloodRequestStatus = {
    #pending;
    #forwarded;
    #completed;
  };

  type BloodRequestDto = {
    id : Nat;
    fromRole : Text;
    fromId : Nat;
    toRole : Text;
    toId : Nat;
    patientName : Text;
    age : Nat;
    bloodGroup : Text;
    hospitalName : Text;
    hospitalAddress : Text;
    attenderName : Text;
    contact : Text;
    altContact : ?Text;
    operationDate : Text;
    status : BloodRequestStatus;
    createdAt : Int;
  };

  type NoticeDto = {
    id : Nat;
    fromRole : Text;
    fromId : Nat;
    toRole : Text;
    toId : ?Nat;
    message : Text;
    createdAt : Int;
  };

  // -------------------------------------------------- USER PROFILES -------------------------------------------------- //
  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // -------------------------------------------------- PRINCIPAL MAPPINGS -------------------------------------------------- //
  let dmPrincipals = Map.empty<Nat, Principal>();
  let amPrincipals = Map.empty<Nat, Principal>();
  let userPrincipals = Map.empty<Nat, Principal>();

  // -------------------------------------------------- DISTRICTS -------------------------------------------------- //
  let districts = Map.empty<Nat, DistrictDto>();
  var districtIdCounter = 0;

  public shared ({ caller }) func createDistrict(name : Text) : async DistrictDto {
    let id = districtIdCounter;
    let district : DistrictDto = {
      id;
      name;
      isAssigned = false;
    };
    districts.add(id, district);
    districtIdCounter += 1;
    district;
  };

  public query ({ caller }) func getDistrict(id : Nat) : async DistrictDto {
    switch (districts.get(id)) {
      case (null) { Runtime.trap("District not found") };
      case (?district) { district };
    };
  };

  public query ({ caller }) func getDistricts() : async [DistrictDto] {
    districts.values().toArray();
  };

  // -------------------------------------------------- AREAS -------------------------------------------------- //
  let areas = Map.empty<Nat, AreaDto>();
  var areaIdCounter = 0;

  public shared func createArea(dmId : Nat, districtId : Nat, name : Text) : async AreaDto {
    switch (districtManagers.get(dmId)) {
      case (null) {
        Runtime.trap("District Manager not found");
      };
      case (?dm) {
        if (dm.districtId != districtId) {
          Runtime.trap("Unauthorized: Can only create areas in your own district");
        };
        if (dm.status != #approved) {
          Runtime.trap("Unauthorized: Only approved District Managers can create areas");
        };

        let id = areaIdCounter;
        let area : AreaDto = {
          id;
          districtId;
          name;
          isAssigned = false;
        };
        areas.add(id, area);
        areaIdCounter += 1;
        area;
      };
    };
  };

  public query ({ caller }) func getArea(id : Nat) : async AreaDto {
    switch (areas.get(id)) {
      case (null) { Runtime.trap("Area not found") };
      case (?area) { area };
    };
  };

  public query ({ caller }) func getAreasByDistrict(districtId : Nat) : async [AreaDto] {
    areas.values().toArray().filter(func(area) { area.districtId == districtId });
  };

  // -------------------------------------------------- DISTRICT MANAGERS -------------------------------------------------- //
  let districtManagers = Map.empty<Nat, DistrictManagerDto>();
  var districtManagerIdCounter = 0;

  public shared ({ caller }) func registerDistrictManager(username : Text, contact : Text, passwordHash : Text, districtId : Nat) : async DistrictManagerDto {
    let id = districtManagerIdCounter;
    let dm : DistrictManagerDto = {
      id;
      username;
      contact;
      passwordHash;
      districtId;
      status = #pending;
    };
    districtManagers.add(id, dm);
    dmPrincipals.add(id, caller);
    districtManagerIdCounter += 1;
    dm;
  };

  public shared ({ caller }) func approveDistrictManager(dmId : Nat) : async DistrictManagerDto {
    switch (districtManagers.get(dmId)) {
      case (null) { Runtime.trap("District Manager not found") };
      case (?dm) {
        switch (districts.get(dm.districtId)) {
          case (null) { Runtime.trap("District not found") };
          case (?district) {
            let updatedDistrict = { district with isAssigned = true };
            districts.add(dm.districtId, updatedDistrict);
          };
        };

        let updatedDM = { dm with status = #approved };
        districtManagers.add(dmId, updatedDM);
        updatedDM;
      };
    };
  };

  public shared ({ caller }) func rejectDistrictManager(dmId : Nat) : async DistrictManagerDto {
    switch (districtManagers.get(dmId)) {
      case (null) { Runtime.trap("District Manager not found") };
      case (?dm) {
        let updatedDM = { dm with status = #rejected };
        districtManagers.add(dmId, updatedDM);
        updatedDM;
      };
    };
  };

  public shared ({ caller }) func deleteDistrictManager(dmId : Nat) : async () {
    switch (districtManagers.get(dmId)) {
      case (null) { Runtime.trap("District Manager not found") };
      case (?dm) {
        switch (districts.get(dm.districtId)) {
          case (null) {};
          case (?district) {
            let updatedDistrict = { district with isAssigned = false };
            districts.add(dm.districtId, updatedDistrict);
          };
        };
        districtManagers.remove(dmId);
        dmPrincipals.remove(dmId);
      };
    };
  };

  public query ({ caller }) func getDistrictManager(dmId : Nat) : async DistrictManagerDto {
    switch (districtManagers.get(dmId)) {
      case (null) { Runtime.trap("District Manager not found") };
      case (?dm) { dm };
    };
  };

  public query ({ caller }) func getPendingDistrictManagers() : async [DistrictManagerDto] {
    districtManagers.values().toArray().filter(func(dm) { dm.status == #pending });
  };

  public query ({ caller }) func getApprovedDistrictManagers() : async [DistrictManagerDto] {
    districtManagers.values().toArray().filter(func(dm) { dm.status == #approved });
  };

  // -------------------------------------------------- AREA MANAGERS -------------------------------------------------- //
  let areaManagers = Map.empty<Nat, AreaManagerDto>();
  var areaManagerIdCounter = 0;

  public shared ({ caller }) func registerAreaManager(username : Text, contact : Text, passwordHash : Text, districtId : Nat, areaId : Nat) : async AreaManagerDto {
    let id = areaManagerIdCounter;
    let am : AreaManagerDto = {
      id;
      username;
      contact;
      passwordHash;
      districtId;
      areaId;
      status = #pending;
    };
    areaManagers.add(id, am);
    amPrincipals.add(id, caller);
    areaManagerIdCounter += 1;
    am;
  };

  public shared func approveAreaManager(dmId : Nat, amId : Nat) : async AreaManagerDto {
    switch (districtManagers.get(dmId)) {
      case (null) {
        Runtime.trap("District Manager not found");
      };
      case (?dm) {
        if (dm.status != #approved) {
          Runtime.trap("Unauthorized: Only approved District Managers can approve AMs");
        };

        switch (areaManagers.get(amId)) {
          case (null) { Runtime.trap("Area Manager not found") };
          case (?am) {
            if (am.districtId != dm.districtId) {
              Runtime.trap("Unauthorized: Can only approve Area Managers in your district");
            };

            switch (areas.get(am.areaId)) {
              case (null) { Runtime.trap("Area not found") };
              case (?area) {
                let updatedArea = { area with isAssigned = true };
                areas.add(am.areaId, updatedArea);
              };
            };

            let updatedAM = { am with status = #approved };
            areaManagers.add(amId, updatedAM);
            updatedAM;
          };
        };
      };
    };
  };

  public shared func rejectAreaManager(dmId : Nat, amId : Nat) : async AreaManagerDto {
    switch (districtManagers.get(dmId)) {
      case (null) {
        Runtime.trap("District Manager not found");
      };
      case (?dm) {
        if (dm.status != #approved) {
          Runtime.trap("Unauthorized: Only approved District Managers can reject AMs");
        };

        switch (areaManagers.get(amId)) {
          case (null) { Runtime.trap("Area Manager not found") };
          case (?am) {
            if (am.districtId != dm.districtId) {
              Runtime.trap("Unauthorized: Can only reject Area Managers in your district");
            };

            let updatedAM = { am with status = #rejected };
            areaManagers.add(amId, updatedAM);
            updatedAM;
          };
        };
      };
    };
  };

  public shared func deleteAreaManager(dmId : Nat, amId : Nat) : async () {
    switch (districtManagers.get(dmId)) {
      case (null) { Runtime.trap("District Manager not found") };
      case (?dm) {
        if (dm.status != #approved) {
          Runtime.trap("Unauthorized: Only approved District Managers can delete Area Managers");
        };

        switch (areaManagers.get(amId)) {
          case (null) { Runtime.trap("Area Manager not found") };
          case (?am) {
            if (am.districtId != dm.districtId) {
              Runtime.trap("Unauthorized: Can only delete Area Managers in your district");
            };

            switch (areas.get(am.areaId)) {
              case (null) {};
              case (?area) {
                let updatedArea = { area with isAssigned = false };
                areas.add(am.areaId, updatedArea);
              };
            };

            areaManagers.remove(amId);
            amPrincipals.remove(amId);
          };
        };
      };
    };
  };

  public query ({ caller }) func getAreaManager(amId : Nat) : async AreaManagerDto {
    switch (areaManagers.get(amId)) {
      case (null) { Runtime.trap("Area Manager not found") };
      case (?am) { am };
    };
  };

  public query func getPendingAreaManagersForDistrict(districtId : Nat) : async [AreaManagerDto] {
    areaManagers.values().toArray().filter(func(am) {
      am.districtId == districtId and am.status == #pending
    });
  };

  public query ({ caller }) func getApprovedAreaManagersByDistrict(districtId : Nat) : async [AreaManagerDto] {
    areaManagers.values().toArray().filter(func(am) {
      am.districtId == districtId and am.status == #approved
    });
  };

  // -------------------------------------------------- USERS -------------------------------------------------- //
  let users = Map.empty<Nat, UserDto>();
  var userIdCounter = 0;

  public shared ({ caller }) func registerUser(username : Text, contact : Text, passwordHash : Text, districtId : Nat) : async UserDto {
    let id = userIdCounter;
    let user : UserDto = {
      id;
      username;
      contact;
      passwordHash;
      districtId;
    };
    users.add(id, user);
    userPrincipals.add(id, caller);
    userIdCounter += 1;
    user;
  };

  public query ({ caller }) func getUser(userId : Nat) : async UserDto {
    switch (users.get(userId)) {
      case (null) { Runtime.trap("User not found") };
      case (?user) { user };
    };
  };

  // -------------------------------------------------- DONORS -------------------------------------------------- //
  // `donors` keeps the OLD DonorDtoV1 type so existing stable data loads
  // without a compatibility error. All new donors are written to `donorsV2`.
  // postupgrade copies V1 records (with null new fields) into donorsV2 once,
  // then donorsV1Data is cleared so subsequent upgrades skip this step.
  let donors = Map.empty<Nat, DonorDtoV1>();
  let donorsV2 = Map.empty<Nat, DonorDto>();
  var donorIdCounter = 0;
  stable var donorsMigrated = false;

  system func postupgrade() {
    if (not donorsMigrated) {
      for (old in donors.values()) {
        let migrated : DonorDto = {
          id = old.id;
          name = old.name;
          contact = old.contact;
          bloodGroup = old.bloodGroup;
          districtId = old.districtId;
          areaId = old.areaId;
          age = old.age;
          lastDonatedDate = old.lastDonatedDate;
          status = old.status;
          rejectedAt = old.rejectedAt;
          appointedAt = old.appointedAt;
          patientName = old.patientName;
          areaManagerId = old.areaManagerId;
          tempRejectedUntil = null;
          tempRejectedReason = null;
        };
        donorsV2.add(migrated.id, migrated);
        if (old.id >= donorIdCounter) {
          donorIdCounter := old.id + 1;
        };
      };
      donorsMigrated := true;
    };
  };

  public shared func addDonor(name : Text, contact : Text, bloodGroup : Text, districtId : Nat, areaId : Nat, age : Nat, lastDonatedDate : ?Int, areaManagerId : Nat) : async DonorDto {
    switch (areaManagers.get(areaManagerId)) {
      case (null) {
        Runtime.trap("Area Manager not found");
      };
      case (?am) {
        if (am.status != #approved) {
          Runtime.trap("Unauthorized: Only approved Area Managers can add donors");
        };
        if (am.areaId != areaId) {
          Runtime.trap("Unauthorized: Can only add donors in your own area");
        };

        let id = donorIdCounter;
        let donor : DonorDto = {
          id;
          name;
          contact;
          bloodGroup;
          districtId;
          areaId;
          age;
          lastDonatedDate;
          status = #available;
          rejectedAt = null;
          appointedAt = null;
          patientName = null;
          areaManagerId;
          tempRejectedUntil = null;
          tempRejectedReason = null;
        };
        donorsV2.add(id, donor);
        donorIdCounter += 1;
        donor;
      };
    };
  };

  public query func getDonorsByArea(areaId : Nat) : async [DonorDto] {
    donorsV2.values().toArray().filter(func(donor) { donor.areaId == areaId }).sort();
  };

  public shared func updateDonorStatus(
    donorId : Nat,
    status : DonorStatus,
    rejectedAt : ?Int,
    appointedAt : ?Int,
    patientName : ?Text,
    tempRejectedUntil : ?Int,
    tempRejectedReason : ?Text
  ) : async DonorDto {
    switch (donorsV2.get(donorId)) {
      case (null) { Runtime.trap("Donor not found") };
      case (?donor) {
        let updatedDonor = {
          donor with
          status;
          rejectedAt;
          appointedAt;
          patientName;
          tempRejectedUntil;
          tempRejectedReason;
        };
        donorsV2.add(donorId, updatedDonor);
        updatedDonor;
      };
    };
  };

  public shared func restoreDonor(donorId : Nat) : async DonorDto {
    switch (donorsV2.get(donorId)) {
      case (null) { Runtime.trap("Donor not found") };
      case (?donor) {
        let updatedDonor = {
          donor with
          status = #available;
          rejectedAt = null;
          tempRejectedUntil = null;
          tempRejectedReason = null;
        };
        donorsV2.add(donorId, updatedDonor);
        updatedDonor;
      };
    };
  };

  public shared func deleteDonor(donorId : Nat) : async () {
    switch (donorsV2.get(donorId)) {
      case (null) { Runtime.trap("Donor not found") };
      case (?donor) {
        donorsV2.remove(donorId);
      };
    };
  };

  // -------------------------------------------------- BLOOD REQUESTS -------------------------------------------------- //
  let bloodRequests = Map.empty<Nat, BloodRequestDto>();
  var bloodRequestIdCounter = 0;

  public shared func createBloodRequest(
    fromRole : Text,
    fromId : Nat,
    toRole : Text,
    toId : Nat,
    patientName : Text,
    age : Nat,
    bloodGroup : Text,
    hospitalName : Text,
    hospitalAddress : Text,
    attenderName : Text,
    contact : Text,
    altContact : ?Text,
    operationDate : Text
  ) : async BloodRequestDto {
    let id = bloodRequestIdCounter;
    let request : BloodRequestDto = {
      id;
      fromRole;
      fromId;
      toRole;
      toId;
      patientName;
      age;
      bloodGroup;
      hospitalName;
      hospitalAddress;
      attenderName;
      contact;
      altContact;
      operationDate;
      status = #pending;
      createdAt = Time.now();
    };
    bloodRequests.add(id, request);
    bloodRequestIdCounter += 1;
    request;
  };

  public shared func forwardBloodRequest(requestId : Nat, toRole : Text, toId : Nat) : async BloodRequestDto {
    switch (bloodRequests.get(requestId)) {
      case (null) { Runtime.trap("Blood request not found") };
      case (?request) {
        let updatedRequest = {
          request with
          toRole;
          toId;
          status = #forwarded;
        };
        bloodRequests.add(requestId, updatedRequest);
        updatedRequest;
      };
    };
  };

  public shared func completeBloodRequest(requestId : Nat) : async BloodRequestDto {
    switch (bloodRequests.get(requestId)) {
      case (null) { Runtime.trap("Blood request not found") };
      case (?request) {
        let updatedRequest = {
          request with
          status = #completed;
        };
        bloodRequests.add(requestId, updatedRequest);
        updatedRequest;
      };
    };
  };

  public query func getBloodRequestsForRecipient(toRole : Text, toId : Nat) : async [BloodRequestDto] {
    bloodRequests.values().toArray().filter(func(req) {
      req.toRole == toRole and req.toId == toId
    });
  };

  // -------------------------------------------------- NOTICES -------------------------------------------------- //
  let notices = Map.empty<Nat, NoticeDto>();
  var noticeIdCounter = 0;

  public shared func sendNotice(fromRole : Text, fromId : Nat, toRole : Text, toId : ?Nat, message : Text) : async NoticeDto {
    let id = noticeIdCounter;
    let notice : NoticeDto = {
      id;
      fromRole;
      fromId;
      toRole;
      toId;
      message;
      createdAt = Time.now();
    };
    notices.add(id, notice);
    noticeIdCounter += 1;
    notice;
  };

  public query func getNoticesForRecipient(role : Text, id : Nat) : async [NoticeDto] {
    notices.values().toArray().filter(func(notice) {
      notice.toRole == role and (switch (notice.toId) {
        case (null) { true };
        case (?toId) { toId == id };
      })
    });
  };
};
