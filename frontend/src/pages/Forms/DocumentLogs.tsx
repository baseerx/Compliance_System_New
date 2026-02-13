import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  Button,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import api from "../../api/axios";
import Swal from "sweetalert2";

interface Log {
  id: number;
  action: string;
  message: string;
  old_status?: string;
  new_status?: string;
  old_due_date?: string;
  new_due_date?: string;
  next_due_date?: string;
  created_at: string;
}

const DocumentLogs: React.FC = () => {
  const { id } = useParams<{ id: string }>(); 
  const navigate = useNavigate();

  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [letterRefNo, setLetterRefNo] = useState<string>("");

  useEffect(() => {
    if (!id) {
      setError("No task ID provided");
      setLoading(false);
      return;
    }
    
    fetchLetterLogs();
  }, [id]);

  const fetchLetterLogs = async () => {
    try {
      setLoading(true);
      
      const res = await api.get(`/letters/history/${id}/`);
      
      setLogs(res.data);
      setError(null);
      
      fetchLetterDetails();
      
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "Failed to load logs";
      setError(errorMsg);
      Swal.fire("Error", errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchLetterDetails = async () => {
    try {
      const res = await api.get(`/letters/${id}/`);
      setLetterRefNo(res.data.ref_no || "");
    } catch (err) {
      console.warn("Could not fetch task details");
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
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/document-view")}
          sx={{ mt: 2 }}
        >
          Back to Tasks
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <Typography variant="h5">
          Tasks History
          {letterRefNo && ` - ${letterRefNo}`}
        </Typography>
      </Box>

      <Paper sx={{ mt: 2, p: 2 }}>
        {logs.length === 0 ? (
          <Alert severity="info">No logs available for this document.</Alert>
        ) : (
          <>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
              Total Logs: {logs.length}
            </Typography>

            <List>
              {logs.map((log, index) => (
                <React.Fragment key={log.id}>
                  <ListItem sx={{ flexDirection: "column", alignItems: "flex-start" }}>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                          {index + 1}. {log.action.toUpperCase()}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {log.message}
                          </Typography>

                          <Typography variant="caption" color="text.secondary">
                            <strong>Date:</strong>{" "}
                            {new Date(log.created_at).toLocaleString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Typography>

                          {log.old_status && log.new_status && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              <strong>Status Change:</strong>{" "}
                              <span style={{ 
                                color: "#f44336", 
                                textDecoration: "line-through" 
                              }}>
                                {log.old_status}
                              </span>
                              {" → "}
                              <span style={{ color: "#4caf50", fontWeight: "bold" }}>
                                {log.new_status}
                              </span>
                            </Typography>
                          )}

                          {log.old_due_date && log.new_due_date && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              <strong>Due Date Change:</strong>{" "}
                              <span style={{ color: "#f44336" }}>
                                {new Date(log.old_due_date).toLocaleDateString()}
                              </span>
                              {" → "}
                              <span style={{ color: "#4caf50" }}>
                                {new Date(log.new_due_date).toLocaleDateString()}
                              </span>
                            </Typography>
                          )}

                          {log.next_due_date && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              <strong>Next Due Date:</strong>{" "}
                              {new Date(log.next_due_date).toLocaleDateString()}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < logs.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default DocumentLogs;