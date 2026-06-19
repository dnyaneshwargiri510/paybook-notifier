import { useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Space, Typography, Alert, Modal } from "antd";
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
    if (punch.type === "IN" && !activeIn) {
      activeIn = current;
    }
    if (punch.type === "OUT" && activeIn) {
      workedMinutes += current.diff(activeIn, "minute");
      activeIn = null;
    }
  }

  if (activeIn) {
    const now = dayjs();
    const currentTime = dayjs(`2026-01-01 ${now.format("HH:mm")}`);
    workedMinutes += currentTime.diff(activeIn, "minute");
  }
  const lastInPunch = [...punches].reverse().find((p) => p.type === "IN");
  const isCurrentlyInOffice = activeIn !== null;
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

  let leaveTime = null;

  if (isCurrentlyInOffice) {
    leaveTime = dayjs().add(remainingMinutes, "minute").format("HH:mm");
  }

  return {
    completed: false,
    leaveTime,
    workedMinutes,
    remainingMinutes,
    isCurrentlyInOffice,
    activeInTime: activeIn ? activeIn.format("HH:mm") : null,
  };
}

function openEowEmail({
  currentWeekTasks,
  nextWeekTasks,
  roadblocks,
  employeeName,
}) {
  const formattedDate = dayjs().format("DD/MM/YYYY");
  const subject = `EOW - ${employeeName} - ${formattedDate}`;
  const createRows = (text) => {
    return text
      .split("\n")
      .filter(Boolean)
      .map((line, index) => {
        const parts = line.split("|");
        return `
<tr>
  <td>${index + 1}</td>
  <td>${parts[0] || ""}</td>
  <td>${parts[1] || ""}</td>
</tr>
`;
      })
      .join("");
  };

  const formatTasks = (text) => {
    return text
      .split("\n")
      .filter(Boolean)
      .map((line, index) => {
        return `${index + 1}. ${line} | `;
      })
      .join("\n");
  };

  const body = `Hello Team,

Please find my EOW update for this week below.

IN A FEW WORDS, HOW DID THIS WEEK GO FOR YOU?
This week was productive and focused on ongoing deliverables, collaboration, and progress across assigned tasks.

TASKS ACCOMPLISHED THIS WEEK:

------------------------------------------------------------
Sr No | Project / Task | Description
------------------------------------------------------------
${formatTasks(currentWeekTasks)}

NEXT WEEK'S TOP PRIORITIES:
------------------------------------------------------------
Sr No | Project / Task | Description
------------------------------------------------------------
${formatTasks(nextWeekTasks)}

ROADBLOCKS:

${roadblocks || "Currently, there are no major blockers."}

Best regards,
${employeeName}
`;
  const mailto = `mailto:Mceod@transperfect.com?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;

  window.location.href = mailto;
}

export default function App() {
  const [text, setText] = useState("");
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [now, setNow] = useState(dayjs());
  const result = useMemo(() => calculateLeaveTime(text), [text, now]);

  const [eowOpen, setEowOpen] = useState(false);
  const [currentWeekTasks, setCurrentWeekTasks] = useState("");
  const [nextWeekTasks, setNextWeekTasks] = useState("");
  const [roadblocks, setRoadblocks] = useState("");
  const [employeeName, setEmployeeName] = useState("");

  useEffect(() => {
    if (!notificationEnabled || !result || !result.leaveTime) {
      return;
    }

    if (result.completed) {
      new Notification("It's Time to leave office 🎉 ");
      return;
    }

    const now = dayjs();

    const leaveMoment = dayjs(
      `${now.format("YYYY-MM-DD")} ${result.leaveTime}`,
    );

    const delay = leaveMoment.diff(now);

    if (delay <= 0) {
      new Notification("It's Time to leave office 🎉 ");
      return;
    }

    const timer = setTimeout(() => {
      new Notification("It's Time to leave office 🎉 ");
    }, delay);

    return () => clearTimeout(timer);
  }, [notificationEnabled, result]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(dayjs());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!notificationEnabled) {
      return;
    }
    const scheduleLunchNotification = () => {
      const now = dayjs();
      let lunchTime = dayjs().hour(12).minute(45).second(0).millisecond(0);
      if (now.isAfter(lunchTime)) {
        lunchTime = lunchTime.add(1, "day");
      }
      const delay = lunchTime.diff(now);
      const timer = setTimeout(() => {
        new Notification("🍱 Lunch Time!", {
          body: "It's 12:45 PM. Time to take your lunch break.",
        });
        scheduleLunchNotification();
      }, delay);
      return timer;
    };
    const timer = scheduleLunchNotification();
    return () => clearTimeout(timer);
  }, [notificationEnabled]);

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
          {dayjs().day() === 4 && (
            <Alert
              type="warning"
              banner
              showIcon
              message="It's Thursday — don't forget to send your EOW email. Click on the 'Send EOW Email' button to proceed."
            />
          )}

          <div
            style={{
              position: "relative",
              textAlign: "center",
            }}
          >
            <Button
              type="link"
              onClick={() => setEowOpen(true)}
              style={{
                position: "absolute",
                right: 0,
                top: 0,
              }}
            >
              Send EOW Email
            </Button>

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
            <Alert type="success" title="Notifications enabled" showIcon />
          )}

          <Modal
            title="Send EOW Email"
            open={eowOpen}
            onCancel={() => setEowOpen(false)}
            onOk={() => {
              openEowEmail({
                currentWeekTasks,
                nextWeekTasks,
                roadblocks,
                employeeName,
              });

              setEowOpen(false);
            }}
            okText="Open Outlook"
            width={700}
          >
            <Space
              orientation="vertical"
              size="middle"
              style={{ width: "100%" }}
            >
              <Input
                placeholder="Your Name"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
              />

              <div>
                <Text strong>Current Week Tasks</Text>

                <TextArea
                  rows={6}
                  placeholder={`1. 
2. 
3. `}
                  value={currentWeekTasks}
                  onChange={(e) => setCurrentWeekTasks(e.target.value)}
                />
              </div>

              <div>
                <Text strong>Next Week Priorities</Text>

                <TextArea
                  rows={6}
                  placeholder={`1. 
2. 
3. `}
                  value={nextWeekTasks}
                  onChange={(e) => setNextWeekTasks(e.target.value)}
                />
              </div>

              <div>
                <Text strong>Roadblocks</Text>

                <TextArea
                  rows={4}
                  placeholder="Mention blockers if any"
                  value={roadblocks}
                  onChange={(e) => setRoadblocks(e.target.value)}
                />
              </div>
            </Space>
          </Modal>

          {result && (
            <LiveDashboard
              result={result}
              notificationEnabled={notificationEnabled}
            />
          )}
        </Space>
        {<Footer />}
      </Card>
    </div>
  );
}

function LiveDashboard({ result, notificationEnabled }) {
  const [now, setNow] = useState(dayjs());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(dayjs());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  let liveWorkedMinutes = result.workedMinutes;

  if (result.isCurrentlyInOffice && result.activeInTime) {
    liveWorkedMinutes += now.second() / 60;
  }

  const remainingMinutes = Math.max(REQUIRED_MINUTES - liveWorkedMinutes, 0);

  const progress = Math.min((liveWorkedMinutes / REQUIRED_MINUTES) * 100, 100);

  const formatTime = (minutes) => {
    const hrs = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.floor((minutes % 1) * 60);

    return `${hrs}h ${mins}m ${secs}s`;
  };

  return (
    <Card
      style={{
        borderRadius: 20,
      }}
    >
      <Space orientation="vertical" size="large" style={{ width: "100%" }}>
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <Card
            style={{
              flex: 1,
              minWidth: 250,
              borderRadius: 20,
              textAlign: "center",
            }}
          >
            <Text type="secondary">Worked Hours</Text>

            <div
              style={{
                fontSize: 48,
                fontWeight: 800,
                marginTop: 16,
                color:
                  liveWorkedMinutes > REQUIRED_MINUTES ? "#ff4d4f" : "inherit",
              }}
            >
              {formatTime(liveWorkedMinutes)}
            </div>
          </Card>

          <Card
            style={{
              flex: 1,
              minWidth: 250,
              borderRadius: 20,
              textAlign: "center",
            }}
          >
            <Text type="secondary">Remaining Time</Text>

            <div
              style={{
                fontSize: 48,
                fontWeight: 800,
                marginTop: 16,
              }}
            >
              {formatTime(remainingMinutes)}
            </div>
          </Card>
        </div>

        <Card
          style={{
            borderRadius: 20,
            textAlign: "center",
          }}
        >
          <Text type="secondary">Leave Office At</Text>

          {result.leaveTime ? (
            <div
              style={{
                fontSize: 64,
                fontWeight: 900,
                marginTop: 10,
                letterSpacing: 2,
              }}
            >
              {result.leaveTime}
            </div>
          ) : (
            <div
              style={{
                fontSize: 14, // Small font size
                color: "#ff4d4f", // Ant Design standard red color
                fontWeight: 500,
                marginTop: 15,
              }}
            >
              As per Punches it seems you are not in the office yet hence leave
              time cannot be calculated
            </div>
          )}

          {notificationEnabled && (
            <Alert
              type="success"
              title="Leave notification enabled"
              showIcon
              style={{
                marginTop: 20,
              }}
            />
          )}
        </Card>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            <span>Daily Progress</span>
            <span>{progress.toFixed(1)}%</span>
          </div>

          <div
            style={{
              height: 22,
              background: "#e5e7eb",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: "linear-gradient(90deg, #1677ff, #52c41a)",
                transition: "width 1s linear",
              }}
            />
          </div>
        </div>
      </Space>
    </Card>
  );
}

function Footer() {
  return (
    <div
      style={{
        marginTop: 40,
        textAlign: "center",
        opacity: 0.7,
      }}
    >
      <Text type="secondary">
        Creation of lazy mind of{" "}
        <a
          href="https://github.com/dnyaneshwargiri510"
          target="_blank"
          rel="noreferrer"
        >
          Dnyaneshwar Giri
        </a>
      </Text>
    </div>
  );
}
