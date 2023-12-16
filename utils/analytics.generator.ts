import { Document, Model } from 'mongoose';

interface MonthData {
  month: string;
  count: number;
}

export async function generateLast12MonthsData<T extends Document>(
  model: Model<T>
): Promise<{ last12Months: MonthData[] }> {
  const last12Months: MonthData[] = [];
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + 1);

  for (let i = 11; i >= 0; i--) {
    // Calculating start and end dates for each month
    const endDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate() - i * 28
    );

    const startDate = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate() - 28
    );

    // Formatting month and year for display
    const monthYear = endDate.toLocaleString('default', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    // Counting documents created within the specified date range
    const count = await model.countDocuments({
      createdAt: {
        $gte: startDate,
        $lt: endDate
      }
    });

    // Adding the month data to the last12Months array
    last12Months.push({ month: monthYear, count });
  }

  return { last12Months };
}
