import { useState, useRef } from "react";
import { differenceInDays } from "date-fns";
import { Header } from "@/components/Header";
import { Stepper } from "@/components/Stepper";
import { StepTripData } from "@/components/StepTripData";
import { StepAppointments } from "@/components/StepAppointments";
import { StepResults } from "@/components/StepResults";
import type { TripData, Appointment } from "@/data/mockData";

const STEPS = ["Dados da Viagem", "Compromissos", "Resultados"];

export default function Index() {
  const [step, setStep] = useState(1);
  const [tripData, setTripData] = useState<TripData>({
    city: "",
    cityId: "",
    checkIn: undefined,
    checkOut: undefined,
    travelers: 1,
  });
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const nights =
    tripData.checkIn && tripData.checkOut
      ? Math.max(1, differenceInDays(tripData.checkOut, tripData.checkIn))
      : 1;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <div className="border-b bg-card px-4 py-3">
        <Stepper currentStep={step} steps={STEPS} />
      </div>

      {step === 1 && (
        <StepTripData
          data={tripData}
          onChange={(newData) => {
            if (newData.city !== tripData.city) {
              setAppointments([]);
            }
            setTripData(newData);
          }}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <StepAppointments
          cityName={tripData.city}
          appointments={appointments}
          onChange={setAppointments}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <StepResults
          cityName={tripData.city}
          cityId={tripData.cityId}
          checkIn={tripData.checkIn!}
          checkOut={tripData.checkOut!}
          appointments={appointments}
          nights={nights}
          onBack={() => setStep(2)}
        />
      )}
    </div>
  );
}
