import { useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Space, Typography, Alert } from "antd";
import dayjs from "dayjs";

const { TextArea } = Input;
const { Title, Text } = Typography;

const REQUIRED_MINUTES = 8 * 60;

function parsePunches(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const punches = [];

  for (const line of lines) {
    const parts = line.split(/\s+/);

    const time = parts.find((p) => /^\d{2}:\d{2}$/.test(p));
    const type = parts.find((p) => p === "IN" || p === "OUT");

    if (!time || !type) {
      continue;
    }

    punches.push({
      time,
      type,
    });
  }

  return punches;
}

function calculateLeaveTime(text) {
  const punches = parsePunches(text);

  if (punches.length === 0) {
    return null;
  }

  let workedMinutes = 0;
  let activeIn = null;

  for (const punch of punches) {
    const current = dayjs(`2026-01-01 ${punch.time}`);

    if (punch.type === "IN") {
      activeIn = current;
    }

    if (punch.type === "OUT" && activeIn) {
      workedMinutes += current.diff(activeIn, "minute");
      activeIn = null;
    }
  }

  if (activeIn) {
    const now = dayjs();

    const currentTime = dayjs(
      `2026-01-01 ${now.format("HH:mm")}`
    );

    workedMinutes += currentTime.diff(activeIn, "minute");
  }
  const lastInPunch = [...punches].reverse().find((p) => p.type === "IN");

  if (!lastInPunch) {
    return null;
  }

  const remainingMinutes = REQUIRED_MINUTES - workedMinutes;

  if (remainingMinutes <= 0) {
    return {
      completed: true,
      leaveTime: dayjs().format("HH:mm"),
      workedMinutes,
    };
  }

  const leaveBaseTime = activeIn
    ? dayjs(`2026-01-01 ${dayjs().format("HH:mm")}`)
    : dayjs(`2026-01-01 ${lastInPunch.time}`);

  const leaveTime = leaveBaseTime
    .add(remainingMinutes, "minute")
    .format("HH:mm");

  return {
    completed: false,
    leaveTime,
    workedMinutes,
    remainingMinutes,
  };
}

export default function App() {
  const [text, setText] = useState("");
  const [notificationEnabled, setNotificationEnabled] = useState(false);

  const result = useMemo(() => calculateLeaveTime(text), [text]);

  useEffect(() => {
    if (!notificationEnabled || !result) {
      return;
    }

    if (result.completed) {
      new Notification("Time to leave office");
      return;
    }

    const now = dayjs();

    const leaveMoment = dayjs(
      `${now.format("YYYY-MM-DD")} ${result.leaveTime}`
    );

    const delay = leaveMoment.diff(now);

    if (delay <= 0) {
      new Notification("Time to leave office");
      return;
    }

    const timer = setTimeout(() => {
      new Notification("Time to leave office");
    }, delay);

    return () => clearTimeout(timer);
  }, [notificationEnabled, result]);

  const enableNotifications = async () => {
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      setNotificationEnabled(true);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        background: "#f5f5f5",
      }}
    >
      <Card
        style={{
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <div>
            <Title level={2}>Paybook Office Timer</Title>
            <Text>
              Paste your punches data and get the expected leave time.
            </Text>
          </div>

          <TextArea
            rows={12}
            placeholder="Paste punches data here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <Button
            type="primary"
            onClick={enableNotifications}
            disabled={!result || !result.leaveTime}
          >
            {!result
              ? "Enable Notifications"
              : notificationEnabled
                ? "Notifications Enabled"
                : "Enable Notifications"}
          </Button>

          {notificationEnabled && (
            <Alert
              type="success"
              title="Notifications enabled"
              showIcon
            />
          )}

          {result && (
            <Card>
              <Space orientation="vertical">
                <Text strong>
                  Worked Hours: {(result.workedMinutes / 60).toFixed(2)} hrs
                </Text>

                {!result.completed && (
                  <>
                    <Text strong>
                      Remaining Time:{" "}
                      {(result.remainingMinutes / 60).toFixed(2)} hrs
                    </Text>

                    <Title level={3} style={{ margin: 0 }}>
                      Leave Office At: {result.leaveTime}
                    </Title>
                  </>
                )}

                {result.completed && (
                  <Alert
                    type="success"
                    title="8 hours completed. Time to leave office."
                    showIcon
                  />
                )}
              </Space>
            </Card>
          )}
        </Space>
      </Card>
    </div>
  );
}
