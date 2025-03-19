import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
} from '@mui/material';
import { Delete, Edit, Add } from '@mui/icons-material';

interface EmergencyContact {
  id: number;
  name: string;
  phone: string;
  relationship: string;
}

const ProfilePage: React.FC = () => {
  const [userInfo, setUserInfo] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    address: '123 Main St, City, Country',
  });

  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([
    {
      id: 1,
      name: 'Jane Doe',
      phone: '+1987654321',
      relationship: 'Spouse',
    },
    {
      id: 2,
      name: 'John Smith',
      phone: '+1122334455',
      relationship: 'Brother',
    },
  ]);

  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
    // Here you would typically make an API call to save the changes
  };

  const handleDeleteContact = (id: number) => {
    setEmergencyContacts(emergencyContacts.filter(contact => contact.id !== id));
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Profile
      </Typography>

      {/* Personal Information */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Personal Information</Typography>
          {!isEditing ? (
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={handleEdit}
            >
              Edit
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
            >
              Save
            </Button>
          )}
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Name"
              value={userInfo.name}
              disabled={!isEditing}
              onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              value={userInfo.email}
              disabled={!isEditing}
              onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Phone"
              value={userInfo.phone}
              disabled={!isEditing}
              onChange={(e) => setUserInfo({ ...userInfo, phone: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Address"
              value={userInfo.address}
              disabled={!isEditing}
              onChange={(e) => setUserInfo({ ...userInfo, address: e.target.value })}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Emergency Contacts */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Emergency Contacts</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              // Add new contact logic
            }}
          >
            Add Contact
          </Button>
        </Box>

        <List>
          {emergencyContacts.map((contact, index) => (
            <React.Fragment key={contact.id}>
              <ListItem>
                <ListItemText
                  primary={contact.name}
                  secondary={`${contact.relationship} - ${contact.phone}`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleDeleteContact(contact.id)}
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
              {index < emergencyContacts.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default ProfilePage; 