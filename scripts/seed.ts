import { drizzle } from "drizzle-orm/mysql2";
import { doctors } from "../drizzle/schema";

async function seed() {
  const db = drizzle(process.env.DATABASE_URL!);

  console.log("🌱 Adding sample doctors...");
  
  const sampleDoctors = [
    { name: "د. أحمد محمد", specialization: "طب الأسنان", isActive: true },
    { name: "د. فاطمة علي", specialization: "جراحة الأسنان", isActive: true },
    { name: "د. محمد حسن", specialization: "تقويم الأسنان", isActive: true },
    { name: "د. سارة أحمد", specialization: "طب الأطفال", isActive: true },
    { name: "د. خالد عبدالله", specialization: "الباطنية", isActive: true },
  ];

  for (const doctor of sampleDoctors) {
    await db.insert(doctors).values(doctor);
  }

  console.log("✅ Sample doctors added successfully!");
  console.log("🎉 Seeding completed!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
