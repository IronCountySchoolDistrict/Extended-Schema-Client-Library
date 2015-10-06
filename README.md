# Extended-Schema-Client-Library
A JavaScript utility for working with PowerSchool's Extended Schema database tables.

# Usage
```
var contact = {
  id: contactRecordResp.id, // Primary key
  contactdcid: contactRecordResp.id // Foreign key
};


// Pass table metadata to the Client constructor
var contactClient = new escl.Client({
  coreTable: 'Students',
  extGroup: 'u_student_contacts',
  extTable: 'u_student_contacts',
  coreTableNumber: '001'
});

contactClient.save(contact).then(function() {
  // Do stuff and things after record is saved
});
```
