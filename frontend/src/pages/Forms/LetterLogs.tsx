import React, { useEffect, useState } from "react";
import {Box,Typography,Paper,CircularProgress,List,ListItem,ListItemText,Divider,Alert,} from "@mui/material";
import { useParams } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";

interface Log {
  _id: string;
  action: string;
  message: string;
  old_status?: string;
  new_status?: string;
  old_due_date?: string;
  new_due_date?: string;
  next_due_date?: string;
  created_at: string;
}

const LetterLogs: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("No letter ID provided");
      setLoading(false);
      return;
    }

    fetchLogs(id);
  }, [id]);

  const fetchLogs = async (letterId: string) => {
    try {
      const res = await axios.get(
        `http://127.0.0.1:8000/api/letters/history/${letterId}/`
      );
      setLogs(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load logs");
      Swal.fire("Error", "Unable to load letter logs", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 5 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading letter logs...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Letter History / Logs
      </Typography>

      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Letter ID: {id}
      </Typography>

      <Paper sx={{ mt: 2, p: 2 }}>
        {logs.length === 0 ? (
          <Alert severity="info">No logs available for this letter.</Alert>
        ) : (
          <>
            <Typography variant="subtitle1" gutterBottom>
              Total Logs: {logs.length}
            </Typography>

            <List>
              {logs.map((log, index) => (
                <React.Fragment key={log._id}>
                  <ListItem>
                    <ListItemText
                          primary={`${index + 1}. ${log.action.toUpperCase()}`}
                          secondary={
                            <>
                              {log.message}
                              <br />

                              <strong>Date:</strong>{" "}
                              {new Date(log.created_at).toLocaleString()}

                              {log.old_status && (
                                <>
                                  <br />
                                  <strong>Status Change:</strong>{" "}
                                  {log.old_status} → {log.new_status}
                                </>
                              )}

                              {log.old_due_date && (
                                <>
                                  <br />
                                  <strong>Old Due:</strong>{" "}
                                  {new Date(log.old_due_date).toLocaleDateString()}
                                </>
                              )}

                              {log.new_due_date && (
                                <>
                                  <br />
                                  <strong>New Due:</strong>{" "}
                                  {new Date(log.new_due_date).toLocaleDateString()}
                                </>
                              )}

                              {log.next_due_date && (
                                <>
                                  <br />
                                  <strong>Next Due:</strong>{" "}
                                  {new Date(log.next_due_date).toLocaleDateString()}
                                </>
                              )}
                            </>
                          }
                        />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default LetterLogs;
