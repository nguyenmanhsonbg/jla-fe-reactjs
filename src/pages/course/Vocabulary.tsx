import { DaySchedule } from "@/components/course";
import React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { HiOutlineChevronLeft, HiOutlineChevronRight } from "react-icons/hi";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { useAuth } from "@/hook/AuthContext";
import Header from "@/layout/header/Header";
import { Tag, notification } from "antd";
import { useEffect, useState, useRef } from "react";
import { HiMiniSpeakerWave } from "react-icons/hi2";
import { useNavigate, useParams } from "react-router-dom";
import axios from 'axios';
import PracticeModal from "@/components/Modal/PracticeModal";

export default function Vocabulary() {
  const [reload, setReload] = useState(true);
  const [courseData, setCourseData] = useState([]);
  const [weekSelected, setWeekSelected] = useState({});
  const [dayCurrent, setDayCurrent] = useState({});
  const { handleFetch } = useAuth();
  const { id, week_id, day_id } = useParams();
  const [learnedVocab, setLearnedVocab] = useState(new Set());
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentDayVocabularyIds, setCurrentDayVocabularyIds] = useState([]);
  const [practicalData, setPracticalData] = useState([]);
  const [isAllLearned, setIsAllLearned] = useState(false);

  const navigate = useNavigate();

  const handleLearningByWeek = () => {
    navigate(`/learningByWeek/${id}`);
  };

  const handleClose = () => {
    setIsModalVisible(false);
  };

  const handleSubmitClick = () => {
    setIsModalVisible(false);
  }

  useEffect(() => {
    const handleFetchData = async () => {
      const response = await handleFetch({
        method: "get",
        url: `/course-detail/${id}`,
      });
      if (response.statusCode === 200) {
        const result = response.data;

        setCourseData(result.courseData);
        setWeekSelected(
          result.weekData?.find((item) => item.week_id === parseInt(week_id))
        );
        const _weekData = result.weekData;
        let _dayCurrent = result.weekData
          ?.find((item) => item.week_id === parseInt(week_id))
          ?.days?.find((item) => item.day_id === parseInt(day_id));
        if (
          _dayCurrent.repeat_lesson &&
          typeof _dayCurrent.repeat_lesson === "string"
        ) {
          const _repeatLesson = JSON.parse(_dayCurrent.repeat_lesson) || [];
          _repeatLesson.forEach((item) => {
            const weekRepeatIndex = item?.split(" - ")[0]?.replace("Week ", "");
            const dayRepeatIndex = item?.split(" - ")[1]?.replace("Day ", "");
            _dayCurrent.lessons = [
              ...(_dayCurrent?.lessons || []),
              ...(_weekData[weekRepeatIndex - 1]?.days[dayRepeatIndex - 1]
                ?.lessons || []),
            ];
          });
        }

        const vocabularyIds = _dayCurrent?.lessons
          ?.filter((lesson) => lesson.vocab_id !== undefined)
          ?.map((lesson) => lesson.vocab_id);

        setDayCurrent(_dayCurrent);
        setCurrentDayVocabularyIds(vocabularyIds);
      }
    };

    const fetchLearnedVocab = async () => {
      try {
        let token = "";
        let accountId;
        const userEncode = localStorage.getItem("user");
        if (userEncode) {
          const userDecode = JSON.parse(userEncode);
          token = userDecode?.token;
          accountId = userEncode ? JSON.parse(userEncode)?.account_id : null;
        }
        const request = await axios.get(`/user-vocabulary-learned/${accountId}`, {
          headers: {
            Authorization: token,
          },
        });
        if (request.status === 200) {
          const learnedVocabIds = request.data.map((item) => item.vocabulary_id);
          setLearnedVocab(new Set(learnedVocabIds));
        }
      } catch (error) {
        navigate('/error', { state: { message: error } });
      }
    };

    if (reload) {
      handleFetchData();
      fetchLearnedVocab();
      setReload(false);
    }
  }, [reload]);

  const handleComplete = async () => {
    if (isAllLearned) return;
    try {
      const userEncode = localStorage.getItem("user");
      const token = userEncode ? JSON.parse(userEncode)?.token : '';
      await axios.post('/update-all-vocabulary-learned', {
        accountId: JSON.parse(userEncode)?.account_id,
        vocabularyIds: currentDayVocabularyIds,
      }, {
        headers: {
          Authorization: token,
        },
      });
      setReload(true);
    } catch (error) {
      console.error("Error update vocabulary process", error);
      notification.error({
        message: "Failed to update kanji learned",
        description: `Error: ${error}`,
      });
    }
  };

  const handlePlayAudio = (linkAudio) => {
    const audio = new Audio(linkAudio);
    audio.play();
  };

  const VocabularyCarousel = ({ dayCurrent, handlePlayAudio, day_id }) => {
    const [viewedItems, setViewedItems] = useState(new Set([0]));
    const itemRefs = useRef([]);
    const [allViewed, setAllViewed] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.dataset.index, 10);
            setViewedItems((prev) => new Set(prev).add(index));
            setActiveIndex(index);
          }
        });
      }, { threshold: 0.3 });

      itemRefs.current.forEach((ref) => ref && observer.observe(ref));

      return () => {
        itemRefs.current.forEach((ref) => ref && observer.unobserve(ref));
      };
    }, [dayCurrent]);

    // useEffect(() => {
    //   const numberOfVocabulary = dayCurrent?.lessons?.filter(lesson => lesson.vocab_id !== undefined).length;
    //   if (numberOfVocabulary === viewedItems.size) {
    //     setAllViewed(true);
    //   }
    // }, [viewedItems, dayCurrent]);

    const handlePractice = async () => {
      await fetchPracticalData();
      if (practicalData) {
        setIsModalVisible(true);
      }
    };

    const fetchPracticalData = async () => {
      try {
        const userEncode = localStorage.getItem("user");
        const token = userEncode ? JSON.parse(userEncode)?.token : '';
        const request = await axios.post('/generate-vocabulary-practice-data', {
          accountId: JSON.parse(userEncode)?.account_id,
          vocabularyIds: currentDayVocabularyIds,
        }, {
          headers: {
            Authorization: token,
          },
        });
        const response = request.data;
        if (response.statusCode === 200) {
          setPracticalData(response.data);
        }
      } catch (error) {
        console.error("Error update vocabulary process", error);
        navigate('/error', { state: { message: 'An error occurred while fetching data. Please try again later.' } });
      }
    };


    const isLearned = (vocabId) => {
      const learned = learnedVocab.has(vocabId);
      return learned;
    };

    // Filter lessons with defined vocab_id and check if all are learned
    const isAllLearned = dayCurrent?.lessons
      ?.filter((lesson) => lesson.vocab_id !== undefined)
      ?.every((lesson) => isLearned(lesson.vocab_id));
    
    setIsAllLearned(isAllLearned);

    const handleSummaryClick = (index) => {
      setActiveIndex(index);
      const targetItem = itemRefs.current[index];
      if (targetItem) {
        targetItem.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    };

    const handleCarouselPrevious = () => {
      if (activeIndex > 0) {
        setActiveIndex(activeIndex - 1);
        const targetItem = itemRefs.current[activeIndex - 1];
        if (targetItem) {
          targetItem.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }
    };


    const handleCarouselNext = () => {
      if (activeIndex < dayCurrent?.lessons?.length - 1) {
        setActiveIndex(activeIndex + 1);
        const targetItem = itemRefs.current[activeIndex + 1];
        if (targetItem) {
          targetItem.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }
    };

    return (
      <div className="flex items-center">
        <button
          onClick={handleCarouselPrevious}
          className="bg-gray-200 rounded-full p-2 shadow-lg"
        >
          <HiOutlineChevronLeft size={30} />
        </button>
        <Carousel className="w-[1200px]" activeIndex={activeIndex} style={{ pointerEvents: 'none' }}>
          <CarouselContent>
            {dayCurrent?.lessons
              ?.filter((item) => item.vocab_id)
              ?.map((lesson, index) => (
                <CarouselItem key={index} active={index === activeIndex}>
                  <div
                    className="p-1"
                    ref={(el) => {
                      if (el && !itemRefs.current[index]) {
                        itemRefs.current[index] = el;
                      }
                    }}
                    data-index={index}
                  >
                    <Card>
                      <CardContent className={`flex flex-row px-16 pt-10 h-[670px] w-[1200px] ${isAllLearned ? 'bg-[#e0f7fa]' : 'bg-[#f2fae9]'}`}>
                        <div className="flex flex-col gap-9 basis-2/5">
                          <div className="text-2xl text-[#7db660] font-semibold">
                            Từ vựng{" "}
                            {parseInt(lesson.day_id) !== parseInt(day_id) && (
                              <>
                                &ensp; <Tag color="green">Nhắc lại</Tag>
                              </>
                            )}
                          </div>
                          <div className="flex flex-col items-center gap-5">
                            <img
                              className="h-[450px] w-[450px] rounded-md shadow-md"
                              src={
                                lesson?.vocab_image
                                  ? lesson?.vocab_image.split(", ")[0]
                                  : "/banner.png"
                              }
                            />
                            <HiMiniSpeakerWave
                              size={30}
                              className="cursor-pointer"
                              onClick={() => handlePlayAudio(lesson.vocab_audio)}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col p-16 basis-3/5">
                          <div className="flex flex-row basis-1/4">
                            <div className="flex flex-col items-center justify-center gap-3 basis-1/2">
                              <div className="bg-[#b6da9f] w-[140px] h-[40px] p-2 text-center rounded-md shadow-sm font-semibold">
                                Từ vựng
                              </div>
                              <div>{lesson.vocab_name}</div>
                            </div>
                            <div className="flex flex-col items-center justify-center gap-3 basis-1/2">
                              <div className="bg-[#b6da9f] w-[140px] h-[40px] p-2 text-center rounded-md shadow-sm font-semibold">
                                Kanji
                              </div>
                              <div>{lesson.vocab_kanji}</div>
                            </div>
                          </div>
                          <div className="flex flex-col items-center justify-center gap-3 basis-1/4">
                            <div className="bg-[#b6da9f] w-[140px] h-[40px] p-2 text-center rounded-md shadow-sm font-semibold">
                              Nghĩa
                            </div>
                            <div>{lesson.vocab_meaning}</div>
                          </div>

                          <div className="flex flex-col items-center gap-5 pt-10 basis-2/4 ">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <div className="bg-[#b6da9f] w-[140px] h-[40px] p-2 text-center rounded-md shadow-sm font-semibold">
                                Ví dụ
                              </div>
                              <div className="flex flex-col gap-2">
                                <div>{lesson.vocab_example}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
          </CarouselContent>
        </Carousel>
        <button
          onClick={handleCarouselNext}
          className="bg-gray-200 rounded-full p-2 shadow-lg"
        >
          <HiOutlineChevronRight size={30} />
        </button>
        <div className="summary-section block justify-center mt-4">
          {dayCurrent?.lessons
            ?.filter((item) => item.vocab_id)
            ?.map((_, index) => (
              <div
                key={index}
                onClick={() => handleSummaryClick(index)}
                className={`w-6 h-6 m-1 rounded-full flex items-center justify-center text-white cursor-pointer ${index === activeIndex
                  ? 'bg-blue-500'
                  : 'bg-green-500'
                  }`}
              >
                {index + 1}
              </div>
            ))}
        </div>
        {isAllLearned && (
          <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white p-4 rounded-lg shadow-lg animate-bounce"  onClick={handlePractice}>
            Đã hoàn thành
          </div>
        )}

        {!isAllLearned && !isModalVisible && (
          <div className="fixed bottom-3 left-1/2 ">
            <button
              onClick={handlePractice}
              className="bg-green-500 text-white p-4 rounded-lg"
            >
              Làm bài luyện tập
            </button>
          </div>
        )}
      </div>
    );
  };


  const [widthScreen, setWidthScreen] = useState(window.innerWidth);

  useEffect(() => {
    window.addEventListener("resize", () => {
      setWidthScreen(window.innerWidth);
    });
    return () =>
      window.removeEventListener("resize", () => {
        setWidthScreen(window.innerWidth);
      });
  }, []);

  if (widthScreen >= 768)
    return (
      <div>
        {/* Header */}
        <div className="bg-[#f2fae9]">
          <Header />
        </div>
        {/* Body */}
        <div className="flex flex-row">
          {/* DaySchedule */}
          <div className="p-5 shadow-md basis-1/6 h-[830px]">
            <DaySchedule weekSelected={weekSelected} id={id} />
          </div>
          {/* Content */}
          <div className="flex flex-col basis-5/6 pt-7 pl-11">
            {/* Breadcrumb */}
            <div>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      href="/course"
                      className="text-2xl font-semibold"
                    >
                      Khóa học
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      onClick={handleLearningByWeek}
                      className="text-2xl font-semibold"
                    >
                      {courseData?.course_name}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbPage className="text-2xl font-semibold">
                    {weekSelected?.week_name}
                  </BreadcrumbPage>
                  <BreadcrumbSeparator />
                  <BreadcrumbPage className="text-2xl font-semibold">
                    {dayCurrent?.day_name}
                  </BreadcrumbPage>
                  <BreadcrumbSeparator />
                  <BreadcrumbPage className="text-2xl font-semibold">
                    Từ mới
                  </BreadcrumbPage>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            {/* Vocab Card */}
            <div className="flex justify-center w-full mt-7">
              <div>
                <VocabularyCarousel
                  dayCurrent={dayCurrent}
                  handlePlayAudio={(audioUrl) => handlePlayAudio(audioUrl)}
                  day_id={day_id}
                />
              </div>
              <div>
                <PracticeModal
                  title={"Luyện tập từ vựng"}
                  practiceData={practicalData}
                  isModalVisible={isModalVisible}
                  onSubmit={handleSubmitClick}
                  onClose={handleClose}
                  onPass={handleComplete}
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    );

  if (widthScreen < 768) return <p>Say hiii</p>;
}
